import { env } from "@/config/env";
import {
  AccessSessionExpiredError,
  browserRecoveryEnvironment,
  clearReauthRecord,
  isAccessInterception,
  recoverAccessSession,
} from "./access-session";
import type { PlatformAdapter } from "./adapter";
import type { Provider, TimeRange } from "@/types";

/**
 * HttpAdapter — PREPARED, NOT VERIFIED against a live backend.
 *
 * Paths follow docs/API-CONTRACTS.md (provisional). The backend team may refine
 * them; when it does, change only this file. Components never call fetch().
 *
 * Credentials: requests are sent with `credentials: "include"` so the backend
 * can use HttpOnly cookies. No token is read from or written to browser storage.
 *
 * CSRF: cookies are attached by the browser automatically, so any origin can
 * trigger an authenticated request. Every state-changing method therefore
 * carries a CSRF token in the `X-CSRF-Token` header. The token is fetched from
 * `GET /v1/admin/auth/csrf`, held in memory only (never in localStorage or a
 * readable cookie), and re-fetched once on a 403 in case it rotated or the
 * session was renewed in another tab.
 */

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly body: unknown,
    message?: string,
    /**
     * Request path that produced the error.
     *
     * Carried because a status code alone does not say what went wrong: 401 on
     * a login attempt means the credentials were rejected, while 401 on any
     * other endpoint means the session is gone. Reporting both as "session
     * expired" tells an operator with a mistyped password to log in again,
     * which is exactly what they were already doing.
     */
    readonly path?: string,
  ) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "HttpError";
  }
}

/**
 * Endpoints where a 401 means "what you just submitted was rejected", not "your
 * session ended".
 *
 * Compared as whole normalised paths rather than by suffix. Suffix matching
 * would classify any future `/legacy/auth/login` the same way regardless of what
 * it did, and these are the adapter's own paths — it knows them exactly.
 */
const AUTHENTICATION_ATTEMPT_PATHS = new Set(["/v1/admin/auth/login", "/v1/admin/auth/mfa/verify"]);

/** Normalises an adapter path for comparison: one leading slash, no query, no fragment, no trailing slash. */
function normalisePath(path: string): string {
  const withoutFragment = path.split("#")[0] ?? "";
  const withoutQuery = withoutFragment.split("?")[0] ?? "";
  return withoutQuery.replace(/^\/*/, "/").replace(/(.)\/+$/, "$1");
}

/** True when a 401 from this path is a rejected submission, not a lost session. */
export function isAuthenticationAttempt(path: string | undefined): boolean {
  if (!path) return false;
  return AUTHENTICATION_ATTEMPT_PATHS.has(normalisePath(path));
}

/**
 * Contractual error code carried in the response body, when there is one.
 *
 * The status alone under-describes what happened: the backend answers 401 for a
 * wrong password, a wrong TOTP code and an expired MFA challenge alike, and
 * those need different words. The code is part of the wire contract, so reading
 * it is not guesswork.
 */
export function errorCode(body: unknown): string | null {
  if (typeof body !== "string" || body === "") return null;
  try {
    const parsed: unknown = JSON.parse(body);
    if (typeof parsed === "object" && parsed !== null) {
      const code = (parsed as { code?: unknown }).code;
      return typeof code === "string" ? code : null;
    }
  } catch {
    // A non-JSON body is not a contract violation worth surfacing here; the
    // status-based classification still applies.
  }
  return null;
}

export { AccessSessionExpiredError } from "./access-session";

/** Methods that change state and therefore require a CSRF token. */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Contractual error code the server returns when a mutation is rejected
 * specifically because of CSRF. Any other 403 is an authorization or policy
 * denial and must NOT be retried — replaying a denied operation pollutes audit
 * logs and, without idempotency guarantees, is unsafe.
 */
const CSRF_ERROR_CODE = "csrf_token_invalid";

/** Upper bound on an accepted token, so a malformed giant body cannot be used. */
const MAX_CSRF_TOKEN_LENGTH = 512;

/** Raised when a CSRF token cannot be obtained. Mutations fail closed. */
export class CsrfError extends Error {
  override readonly cause: unknown;

  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = "CsrfError";
    this.cause = cause;
  }
}

/** In-memory only. Never persisted, so it cannot outlive the tab or be read from storage. */
let csrfToken: string | null = null;
let csrfInFlight: Promise<string> | null = null;

/**
 * Resolves the API base.
 *
 * A relative base ("/" or "/api") means the management API is served from the
 * SAME origin as the page, behind the reverse proxy. That is the deployment
 * that actually works remotely: an absolute address baked into the bundle
 * breaks the moment an operator connects from any machine other than the one
 * that address refers to — "127.0.0.1:8080" means the operator's own computer.
 *
 * Same-origin also removes CORS from the picture entirely.
 */
function resolveBase(): string {
  const configured = env.apiBaseUrl;
  if (/^https?:\/\//i.test(configured)) {
    return configured.replace(/\/?$/, "/");
  }
  // Relative base. In the browser, resolve against the current origin.
  if (typeof window !== "undefined" && window.location) {
    const prefix = configured.replace(/^\/?/, "/").replace(/\/?$/, "/");
    return new URL(prefix, window.location.origin).toString();
  }
  // During SSR there is no origin to resolve against. Requests are made from
  // the browser, so this path is not exercised; returning the raw value keeps
  // the error message honest if it ever is.
  return configured;
}

function buildUrl(path: string, query?: Record<string, string | undefined>): URL {
  const url = new URL(path.replace(/^\//, ""), resolveBase());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url;
}

/**
 * Fetches a CSRF token, de-duplicating concurrent callers so a burst of
 * mutations produces one token request rather than many.
 *
 * THROWS on any failure. A security prerequisite that cannot be met must stop
 * the request, not be silently skipped.
 */
async function fetchCsrfToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  if (csrfInFlight) return csrfInFlight;
  csrfInFlight = (async () => {
    let response: Response;
    try {
      response = await fetch(buildUrl("v1/admin/auth/csrf"), {
        credentials: "include",
        redirect: "manual",
        headers: { Accept: "application/json" },
      });
    } catch (cause) {
      throw new CsrfError("Could not reach the CSRF token endpoint.", cause);
    }
    // The token fetch is the first call of every mutation, so it is where an
    // expired Access session is usually met. Reporting it as a CSRF failure
    // would send the operator looking for the wrong problem entirely.
    if (isAccessInterception(response)) {
      throw accessExpired();
    }
    if (!response.ok) {
      throw new CsrfError(`CSRF token endpoint returned ${response.status}.`);
    }
    let body: unknown;
    try {
      body = await response.json();
    } catch (cause) {
      throw new CsrfError("CSRF token endpoint returned invalid JSON.", cause);
    }
    const token = (body as { token?: unknown } | null)?.token;
    if (typeof token !== "string" || token.length === 0) {
      throw new CsrfError("CSRF token endpoint returned no usable token.");
    }
    if (token.length > MAX_CSRF_TOKEN_LENGTH) {
      throw new CsrfError("CSRF token exceeds the maximum accepted length.");
    }
    csrfToken = token;
    return token;
  })();
  try {
    return await csrfInFlight;
  } finally {
    csrfInFlight = null;
  }
}

/** True only when a 403 body carries the contractual CSRF error code. */
function isCsrfRejection(body: string): boolean {
  try {
    const parsed = JSON.parse(body) as { code?: unknown };
    return parsed?.code === CSRF_ERROR_CODE;
  } catch {
    // A 403 we cannot classify is treated as an authorization denial, not CSRF.
    return false;
  }
}

async function send(
  url: URL,
  init: RequestInit | undefined,
  method: string,
  token: string | null,
): Promise<Response> {
  return fetch(url, {
    ...init,
    credentials: "include",
    // Stop at a redirect rather than following it. The gateway emits no 3xx of
    // its own, so a redirect here is Cloudflare Access intercepting an expired
    // session; following it lands on a cross-origin page with no CORS headers
    // and the fetch rejects with a TypeError that reads as "backend down".
    redirect: "manual",
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
      // Spread LAST so a caller cannot override the security header. The
      // adapter owns CSRF; callers must not be able to weaken it.
      ...(MUTATING.has(method) && token ? { "X-CSRF-Token": token } : {}),
    },
  });
}

/**
 * Starts re-authentication and returns the error to throw.
 *
 * The navigation happens here rather than at each call site because every
 * request funnels through this module; asking each query hook to recognise the
 * condition would mean each one could forget. The error is still thrown so the
 * UI has something truthful to render during the moment before the page leaves.
 */
function accessExpired(): AccessSessionExpiredError {
  const recovery = browserRecoveryEnvironment();
  if (recovery) recoverAccessSession(recovery);
  return new AccessSessionExpiredError();
}

export async function request<T>(
  path: string,
  init?: RequestInit & { query?: Record<string, string | undefined> },
): Promise<T> {
  if (!env.apiBaseUrl) {
    throw new HttpError(503, null, "VITE_CB67_API_BASE_URL is not configured.");
  }
  const url = buildUrl(path, init?.query);
  const method = (init?.method ?? "GET").toUpperCase();
  const mutating = MUTATING.has(method);

  // Fail closed: if the token cannot be obtained, the mutation is never sent.
  const token: string | null = mutating ? await fetchCsrfToken() : null;

  let response = await send(url, init, method, token);

  // Retry ONLY when the server says this specific 403 was a CSRF failure —
  // meaning the token rotated or the session was renewed elsewhere. An
  // authorization denial must surface immediately and must never be replayed.
  if (response.status === 403 && mutating) {
    const body = await response
      .clone()
      .text()
      .catch(() => "");
    if (isCsrfRejection(body)) {
      csrfToken = null;
      const refreshed = await fetchCsrfToken();
      response = await send(url, init, method, refreshed);
    }
  }

  if (isAccessInterception(response)) {
    throw accessExpired();
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(response.status, body, undefined, path);
  }

  // A response that reached the origin proves Access let it through, so any
  // earlier recovery attempt is finished. Clearing here is what lets a genuine
  // expiry an hour from now recover again instead of being suppressed by a
  // stale marker.
  // Named `recovery`, not `env`: `env` is the imported configuration used at the
  // top of this function, and shadowing it put that binding in a temporal dead
  // zone — every request failed with "Cannot access 'env' before
  // initialization" rather than anything to do with Access.
  const recovery = browserRecoveryEnvironment();
  if (recovery) clearReauthRecord(recovery.storage, recovery.documentId);

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

/** Clears the cached CSRF token. Called on logout so a new session gets a new token. */
export function resetCsrfToken(): void {
  csrfToken = null;
}

const range = (r: TimeRange) => ({ query: { range: r } });

export const httpAdapter: PlatformAdapter = {
  kind: "http",

  login: async (input) => {
    const user = await request<Awaited<ReturnType<PlatformAdapter["login"]>>>(
      "v1/admin/auth/login",
      { method: "POST", body: JSON.stringify(input) },
    );
    // The server rotates the session id and invalidates the pre-authentication
    // CSRF token on success, so the cached one is stale by definition. Clearing
    // it here means the next mutation fetches a fresh token instead of taking a
    // guaranteed 403 first.
    resetCsrfToken();
    return user;
  },
  verifyMfa: async (input) => {
    const user = await request<Awaited<ReturnType<PlatformAdapter["verifyMfa"]>>>(
      "v1/admin/auth/mfa/verify",
      { method: "POST", body: JSON.stringify(input) },
    );
    // A session is created here, so the pre-verification CSRF token is stale for
    // the same reason it is after a single-step login.
    resetCsrfToken();
    return user;
  },
  currentUser: () => request("v1/admin/auth/session"),
  logout: async () => {
    try {
      await request("v1/admin/auth/logout", { method: "POST" });
    } finally {
      // Cleared even if the call fails: a stale token must never be reused
      // against a new session.
      resetCsrfToken();
    }
  },

  getOverview: (r) => request("v1/admin/overview", range(r)),
  globalSearch: (query) => request("v1/admin/search", { query: { q: query } }),

  listHosts: () => request("v1/admin/infrastructure/hosts"),
  listServices: () => request("v1/admin/infrastructure/services"),
  getResourceSeries: (r) => request("v1/admin/infrastructure/resources", range(r)),
  getNetworkSeries: (r) => request("v1/admin/infrastructure/network", range(r)),
  getStorageBreakdown: () => request("v1/admin/infrastructure/storage"),

  listApplications: () => request("v1/admin/applications"),
  getApplication: (id) => request(`v1/admin/applications/${id}`),
  listInstances: (applicationId) =>
    request("v1/admin/instances", { query: { application_id: applicationId } }),
  listMachineClients: () => request("v1/admin/machine-clients"),
  listScopeDefinitions: () => request("v1/admin/scopes"),

  listEndpoints: () => request("v1/admin/api/endpoints"),
  listRequests: () => request("v1/admin/api/requests"),
  listApiErrorGroups: () => request("v1/admin/api/errors"),
  getLatency: (r) => request("v1/admin/api/latency", range(r)),
  listRateLimits: () => request("v1/admin/api/rate-limits"),
  listQuotas: () => request("v1/admin/api/quotas"),

  listProviders: () => request("v1/admin/providers"),
  listProviderProjects: (providerId) =>
    request("v1/admin/providers/projects", { query: { provider: providerId } }),
  listCredentials: (providerId) =>
    request("v1/admin/providers/credentials", { query: { provider: providerId } }),
  getProviderSeries: (providerId: Provider["id"], r) =>
    request(`v1/admin/providers/${providerId}/metrics`, range(r)),

  getLicensingOverview: () => request("v1/admin/licensing/overview"),
  listProducts: () => request("v1/admin/licensing/products"),
  listCustomers: () => request("v1/admin/licensing/customers"),
  listLicenses: () => request("v1/admin/licensing/licenses"),
  getLicense: (id) => request(`v1/admin/licensing/licenses/${id}`),
  listInstallations: () => request("v1/admin/licensing/installations"),
  listLeases: () => request("v1/admin/licensing/leases"),
  listPlans: () => request("v1/admin/licensing/plans"),
  listFeatures: () => request("v1/admin/licensing/features"),
  listRevocations: () => request("v1/admin/licensing/revocations"),

  listAdministrators: () => request("v1/admin/iam/administrators"),
  listRoles: () => request("v1/admin/iam/roles"),
  listPermissions: () => request("v1/admin/iam/permissions"),
  listSessions: () => request("v1/admin/iam/sessions"),

  listCertificates: () => request("v1/admin/pki/certificates"),
  getCertificate: (id) => request(`v1/admin/pki/certificates/${id}`),

  getSecurityOverview: (r) => request("v1/admin/security/overview", range(r)),
  listSecurityEvents: () => request("v1/admin/security/events"),
  getFirewallState: () => request("v1/admin/security/firewall"),

  listLogs: () => request("v1/admin/observability/logs"),
  listAlerts: () => request("v1/admin/observability/alerts"),
  getMetricSeries: (key, r) => request(`v1/admin/observability/metrics/${key}`, range(r)),

  getDatabaseHealth: () => request("v1/admin/database/health"),
  getDatabaseSeries: (r) => request("v1/admin/database/metrics", range(r)),

  listBackupJobs: () => request("v1/admin/backups/jobs"),
  listBackupRuns: () => request("v1/admin/backups/history"),
  listRestoreTests: () => request("v1/admin/backups/restore-tests"),

  listAuditEvents: () => request("v1/admin/audit"),

  getPublicStatus: () => request("v1/public/status"),
  getChangelog: () => request("v1/public/changelog"),

  performAction: ({ action, resourceId, payload }) =>
    request("v1/admin/actions", {
      method: "POST",
      body: JSON.stringify({ action, resource_id: resourceId, payload }),
    }),
};
