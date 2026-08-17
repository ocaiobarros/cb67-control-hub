/**
 * Recovery from an expired Cloudflare Access session.
 *
 * Access sits in front of the admin hostname and gates the whole origin. When
 * its session expires it answers a same-origin API call with a 302 to
 * `<team>.cloudflareaccess.com`. `fetch` follows redirects by default, that hop
 * is cross-origin and carries no CORS headers, so the fetch rejects with a
 * TypeError — indistinguishable from the backend being down. The operator was
 * told the API was unreachable when in fact they simply had to sign in again.
 *
 * DETECTION. Requests are issued with `redirect: "manual"`, so the browser
 * stops at the redirect and hands back an opaque response: `type` is
 * `"opaqueredirect"` and `status` is 0. That is the whole signal, and it is a
 * fact about the response rather than a guess about a message.
 *
 * It is reliable HERE for a specific, verified reason: the gateway emits no 3xx
 * at all — there is no `http.Redirect` in it, and `net/http.ServeMux` returns
 * 404 rather than a trailing-slash redirect for the registered patterns. A 3xx
 * on `/v1/*` therefore means something in front intercepted the call. If the
 * gateway ever starts redirecting, this assumption has to be revisited, which
 * is why it is written down here and covered by a test.
 *
 * RECOVERY. The page navigates the TOP-LEVEL window to the current admin URL.
 * Access intercepts that navigation, runs its own sign-in, and returns the
 * browser to the same URL — it records the destination in the redirect it
 * issues. Nothing here constructs a cloudflareaccess.com URL: doing so would
 * hard-code a team domain and an endpoint shape that are Cloudflare's to
 * change, and would be a worse mechanism than the one Access already provides.
 *
 * What this deliberately does NOT do: weaken CORS, use `mode: "no-cors"`, or
 * arrange any path around Access. The recovery is to authenticate, not to
 * avoid authenticating. CB67's own session, CSRF and RBAC are untouched — an
 * operator who renews Access still has to satisfy all three.
 */

/** Thrown when a request was intercepted and the Access session must be renewed. */
export class AccessSessionExpiredError extends Error {
  constructor() {
    super("The Cloudflare Access session has expired.");
    this.name = "AccessSessionExpiredError";
  }
}

/**
 * Key under which the last recovery attempt is recorded.
 *
 * sessionStorage rather than a module variable: the recovery is a full page
 * navigation, so module state does not survive to see whether it worked.
 */
export const REAUTH_MARKER = "cb67:access-reauth";

/**
 * How long a recovery attempt is remembered.
 *
 * Long enough to cover the round trip through the Access sign-in, short enough
 * that a genuine expiry an hour later is still recoverable.
 */
export const REAUTH_COOLDOWN_MS = 60_000;

/** True when the browser stopped at a redirect instead of following it. */
export function isAccessInterception(response: Pick<Response, "type" | "status">): boolean {
  return response.type === "opaqueredirect";
}

export interface ReauthRecord {
  /** Origin and pathname only — see routeKey. */
  key: string;
  at: number;
  /** Which document wrote it — see DOCUMENT_ID. */
  doc: string;
}

/**
 * Identity of the document currently running.
 *
 * Generated once per document — see the implementation for why it is anchored
 * on `window` rather than on module scope. After the Access round trip the
 * document is new and so is this value.
 *
 * It replaces comparing the marker's timestamp against performance.timeOrigin.
 * Those two came from different clock bases: the marker used Date.now() and the
 * page load used timeOrigin, so a wall clock that moved backwards after load
 * could make a marker written by THIS document look older than the document
 * itself. A slow success would then clear a recovery still in flight and reopen
 * the very race the marker exists to prevent. An identity cannot drift.
 */
const DOCUMENT_ID_KEY = Symbol.for("cb67.access.documentId");

function newDocumentId(): string {
  try {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
      return crypto.randomUUID();
    }
  } catch {
    /* randomUUID is unavailable over plain HTTP; fall through */
  }
  return `d${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/**
 * Anchored on `window`, not on module scope.
 *
 * Module scope is per-EVALUATION, and hot module replacement re-evaluates this
 * file inside the SAME document. A module-scoped id therefore changed while the
 * page stayed put, and an in-flight request from before the reload would clear a
 * marker written after it — reinstating the slow-success race during
 * development. The invariant is meant to be "this document", so it is stored
 * where a document lives.
 *
 * A registered Symbol survives re-evaluation and does not collide with anything
 * else on window.
 */
export const DOCUMENT_ID: string = (() => {
  if (typeof window === "undefined") {
    // Server rendering: a fresh realm per render, and nothing here navigates.
    return newDocumentId();
  }
  const host = window as unknown as Record<symbol, string | undefined>;
  const existing = host[DOCUMENT_ID_KEY];
  if (typeof existing === "string") return existing;
  const created = newDocumentId();
  host[DOCUMENT_ID_KEY] = created;
  return created;
})();

/**
 * The identity a recovery attempt is remembered under.
 *
 * Origin and pathname only. Keying on the full href let a fragment or a
 * throwaway query parameter count as "a different page", so a router that
 * updates either one could take a fresh attempt every time and defeat the
 * cooldown entirely.
 */
export function routeKey(href: string): string {
  try {
    const url = new URL(href);
    // A trailing slash does not make it a different page, and treating it as one
    // would hand a router that adds or drops it an unlimited supply of attempts.
    // Root keeps its slash so the key is never empty.
    const path = url.pathname.replace(/(.)\/+$/, "$1");
    return url.origin + path;
  } catch {
    // A caller that passes something unparseable still gets a stable key.
    return href;
  }
}

/**
 * Decides whether to navigate for re-authentication.
 *
 * Refuses when a recovery for the same URL was attempted within the cooldown.
 * That is the loop guard, and it matters: if Access keeps intercepting after a
 * sign-in — a policy that no longer admits this operator, a clock problem, a
 * misconfigured application — then navigating again produces an endless bounce
 * between the app and the Access page, with nothing on screen to explain it.
 * Refusing surfaces an error the operator can act on instead.
 */
export function shouldReauthenticate(
  href: string,
  now: number,
  previous: ReauthRecord | null,
): boolean {
  if (!previous) return true;
  if (previous.key !== routeKey(href)) return true;
  // A clock that moved backwards would otherwise make the elapsed time negative
  // and suppress recovery until it caught up — potentially for hours. A marker
  // from the future is a marker that cannot be trusted, so it is discarded.
  if (now < previous.at) return true;
  return now - previous.at >= REAUTH_COOLDOWN_MS;
}

export function readReauthRecord(storage: Pick<Storage, "getItem">): ReauthRecord | null {
  try {
    const raw = storage.getItem(REAUTH_MARKER);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof (parsed as ReauthRecord).key === "string" &&
      typeof (parsed as ReauthRecord).at === "number" &&
      typeof (parsed as ReauthRecord).doc === "string"
    ) {
      return parsed as ReauthRecord;
    }
    return null;
  } catch {
    // A corrupt marker must not prevent recovery; the cooldown is a guard
    // against looping, not a security control.
    return null;
  }
}

export function writeReauthRecord(storage: Pick<Storage, "setItem">, record: ReauthRecord): void {
  try {
    storage.setItem(REAUTH_MARKER, JSON.stringify(record));
  } catch {
    // Private browsing and quota failures are survivable: without the marker
    // the loop guard is weaker, but the recovery still works.
  }
}

/**
 * Clears the marker, but only when it was written by a DIFFERENT document.
 *
 * Clearing unconditionally on every successful response was a race: a slow
 * request issued while Access was still valid could land AFTER a later request
 * had been intercepted and written its marker, wipe it, and let the next
 * interception navigate again — the loop the marker exists to prevent.
 *
 * A marker written by the document currently running is a recovery in flight
 * and must survive. One from another document means the navigation happened and
 * the browser came back, so it has done its job.
 *
 * Identity rather than a timestamp comparison: see DOCUMENT_ID.
 */
export function clearReauthRecord(
  storage: Pick<Storage, "getItem" | "removeItem">,
  documentId: string,
): void {
  try {
    const record = readReauthRecord(storage);
    if (record && record.doc === documentId) return;
    storage.removeItem(REAUTH_MARKER);
  } catch {
    /* see writeReauthRecord */
  }
}

export interface RecoveryEnvironment {
  href: string;
  now: number;
  storage: Pick<Storage, "getItem" | "setItem" | "removeItem">;
  navigate: (href: string) => void;
  /** Identity of the document performing the recovery — see DOCUMENT_ID. */
  documentId: string;
}

/**
 * Storage that discards everything, used when the real one is unreachable.
 *
 * Reading `window.sessionStorage` can itself throw SecurityError — a document
 * with an opaque origin, or third-party storage blocked by policy — and that
 * throw happens before any of the guarded methods are called. Without this the
 * error escaped instead of the recovery running, so a browser configuration
 * unrelated to Access would have stranded the operator entirely.
 */
const NULL_STORAGE: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function safeSessionStorage(): Pick<Storage, "getItem" | "setItem" | "removeItem"> {
  try {
    return window.sessionStorage ?? NULL_STORAGE;
  } catch {
    return NULL_STORAGE;
  }
}

export type RecoveryOutcome = "navigated" | "suppressed";

/**
 * Performs the recovery, or refuses to when it has just been tried.
 *
 * Returns what happened so the caller can report accurately rather than assume.
 */
export function recoverAccessSession(env: RecoveryEnvironment): RecoveryOutcome {
  const previous = readReauthRecord(env.storage);
  if (!shouldReauthenticate(env.href, env.now, previous)) {
    return "suppressed";
  }
  writeReauthRecord(env.storage, {
    key: routeKey(env.href),
    at: env.now,
    doc: env.documentId,
  });
  // Navigating to the CURRENT url: Access gates the hostname, so it intercepts
  // this navigation, authenticates, and returns here by itself.
  env.navigate(env.href);
  return "navigated";
}

/**
 * Builds the recovery environment from the real browser, or null when there is
 * no browser — during SSR there is nothing to navigate.
 */
export function browserRecoveryEnvironment(): RecoveryEnvironment | null {
  if (typeof window === "undefined" || !window.location) return null;
  return {
    href: window.location.href,
    now: Date.now(),
    storage: safeSessionStorage(),
    documentId: DOCUMENT_ID,
    navigate: (href) => {
      window.location.assign(href);
    },
  };
}
