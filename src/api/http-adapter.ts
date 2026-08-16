import { env } from "@/config/env";
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
  ) {
    super(message ?? `Request failed with status ${status}`);
    this.name = "HttpError";
  }
}

/** Methods that change state and therefore require a CSRF token. */
const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** In-memory only. Never persisted, so it cannot outlive the tab or be read from storage. */
let csrfToken: string | null = null;
let csrfInFlight: Promise<string | null> | null = null;

function buildUrl(path: string, query?: Record<string, string | undefined>): URL {
  const url = new URL(path.replace(/^\//, ""), env.apiBaseUrl.replace(/\/?$/, "/"));
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return url;
}

/**
 * Fetches a CSRF token, de-duplicating concurrent callers so a burst of
 * mutations does not produce a burst of token requests.
 */
async function fetchCsrfToken(): Promise<string | null> {
  if (csrfInFlight) return csrfInFlight;
  csrfInFlight = (async () => {
    try {
      const response = await fetch(buildUrl("v1/admin/auth/csrf"), {
        credentials: "include",
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const body = (await response.json()) as { token?: string };
      csrfToken = body.token ?? null;
      return csrfToken;
    } catch {
      return null;
    } finally {
      csrfInFlight = null;
    }
  })();
  return csrfInFlight;
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
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(MUTATING.has(method) && token ? { "X-CSRF-Token": token } : {}),
      ...init?.headers,
    },
  });
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

  let token: string | null = null;
  if (MUTATING.has(method)) {
    token = csrfToken ?? (await fetchCsrfToken());
  }

  let response = await send(url, init, method, token);

  // A 403 on a mutation usually means the token rotated or the session was
  // renewed elsewhere. Re-fetch once and retry; do not loop.
  if (response.status === 403 && MUTATING.has(method)) {
    csrfToken = null;
    const refreshed = await fetchCsrfToken();
    if (refreshed) response = await send(url, init, method, refreshed);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new HttpError(response.status, body);
  }
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

  login: (input) => request("v1/admin/auth/login", { method: "POST", body: JSON.stringify(input) }),
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
