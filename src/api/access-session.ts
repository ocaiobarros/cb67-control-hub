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
  href: string;
  at: number;
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
  if (previous.href !== href) return true;
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
      typeof (parsed as ReauthRecord).href === "string" &&
      typeof (parsed as ReauthRecord).at === "number"
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

export function clearReauthRecord(storage: Pick<Storage, "removeItem">): void {
  try {
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
  writeReauthRecord(env.storage, { href: env.href, at: env.now });
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
    storage: window.sessionStorage,
    navigate: (href) => {
      window.location.assign(href);
    },
  };
}
