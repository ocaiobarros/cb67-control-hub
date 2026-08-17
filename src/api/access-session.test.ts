import { describe, expect, test, beforeEach, afterEach } from "bun:test";
import {
  AccessSessionExpiredError,
  REAUTH_COOLDOWN_MS,
  REAUTH_MARKER,
  clearReauthRecord,
  isAccessInterception,
  readReauthRecord,
  recoverAccessSession,
  DOCUMENT_ID,
  routeKey,
  shouldReauthenticate,
  writeReauthRecord,
  type RecoveryEnvironment,
} from "./access-session";
import { HttpError } from "./http-adapter";
import { describeError, formatError } from "@/components/common/error-state";

/**
 * Regression tests for recovery from an expired Cloudflare Access session.
 *
 * Access gates the admin hostname. When its session ends it answers a
 * same-origin API call with a 302 to cloudflareaccess.com; `fetch` followed it,
 * the hop was cross-origin with no CORS headers, and the rejection reached the
 * operator as "não foi possível acessar a API de gestão" — pointing at the
 * server when the only problem was that they had to sign in again.
 *
 * The situations below must stay distinguishable from one another. The failure
 * mode being guarded against is any two of them collapsing onto one message or
 * one behaviour.
 */

const ADMIN_URL = "https://admin.cb67labs.api.br/overview";

/** A response the browser stopped at instead of following. */
const opaqueRedirect = () => ({ type: "opaqueredirect" as ResponseType, status: 0 });

function memoryStorage(seed?: Record<string, string>) {
  const map = new Map<string, string>(Object.entries(seed ?? {}));
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => void map.set(k, v),
    removeItem: (k: string) => void map.delete(k),
    size: () => map.size,
    raw: map,
  };
}

function environment(overrides?: Partial<RecoveryEnvironment>) {
  const navigations: string[] = [];
  const storage = memoryStorage();
  const env: RecoveryEnvironment = {
    href: ADMIN_URL,
    now: 1_000_000,
    documentId: DOCUMENT_ID,
    storage,
    navigate: (href) => void navigations.push(href),
    ...overrides,
  };
  return { env, navigations, storage };
}

// ---------------------------------------------------------------------------
// Detection
// ---------------------------------------------------------------------------

describe("detecting an intercepted request", () => {
  test("an opaque redirect is an interception", () => {
    expect(isAccessInterception(opaqueRedirect())).toBe(true);
  });

  test("ordinary responses are not", () => {
    const cases: Array<[string, Pick<Response, "type" | "status">]> = [
      ["200", { type: "basic", status: 200 }],
      ["401 from CB67", { type: "basic", status: 401 }],
      ["403", { type: "basic", status: 403 }],
      ["500", { type: "basic", status: 500 }],
      ["502", { type: "basic", status: 502 }],
      ["204", { type: "basic", status: 204 }],
      ["cors response", { type: "cors", status: 200 }],
    ];
    for (const [name, response] of cases) {
      expect(`${name}: ${isAccessInterception(response)}`).toBe(`${name}: false`);
    }
  });

  test("a real CB67 401 is never read as an Access interception (F)", () => {
    // The two are the whole point of the distinction: one means sign in to
    // Cloudflare, the other means sign in to CB67.
    expect(isAccessInterception({ type: "basic", status: 401 })).toBe(false);
    expect(formatError(new HttpError(401, "", undefined, "v1/admin/auth/session"))).toBe(
      "Sessão expirada. Entre novamente para continuar.",
    );
  });
});

// ---------------------------------------------------------------------------
// C — Access expired during use
// ---------------------------------------------------------------------------

describe("C — an expired Access session navigates for re-authentication", () => {
  test("the top-level window is sent to the current admin URL", () => {
    const { env, navigations } = environment();
    expect(recoverAccessSession(env)).toBe("navigated");
    expect(navigations).toEqual([ADMIN_URL]);
  });

  test("no cloudflareaccess.com URL is constructed by this code", () => {
    // Access records the destination in the redirect it issues, so it returns
    // the browser here by itself. Hand-building its URL would hard-code a team
    // domain and endpoint shape that are Cloudflare's to change.
    const { env, navigations } = environment();
    recoverAccessSession(env);
    expect(navigations[0]).not.toContain("cloudflareaccess.com");
    expect(navigations[0]).not.toContain("/cdn-cgi/access");
    expect(navigations[0]).toBe(ADMIN_URL);
  });

  test("the operator is told what is happening, not that the API is down", () => {
    const described = describeError(new AccessSessionExpiredError());
    expect(described.title).toBe("Sessão do Cloudflare Access expirada.");
    expect(formatError(new AccessSessionExpiredError())).toBe(
      "Sessão do Cloudflare Access expirada. Redirecionando para autenticação.",
    );
    expect(described.title).not.toContain("Dados indisponíveis");
  });

  test("the attempt is recorded so a repeat can be recognised", () => {
    const { env, storage } = environment();
    recoverAccessSession(env);
    const record = readReauthRecord(storage);
    expect(record?.key).toBe("https://admin.cb67labs.api.br/overview");
    expect(record?.at).toBe(1_000_000);
  });
});

// ---------------------------------------------------------------------------
// G — no redirect loop
// ---------------------------------------------------------------------------

describe("G — recovery never loops", () => {
  test("a second attempt for the same URL inside the cooldown is refused", () => {
    const { env, navigations, storage } = environment();

    expect(recoverAccessSession(env)).toBe("navigated");
    // Access bounced the operator straight back — a policy that no longer
    // admits them, or a clock problem. Navigating again would produce an
    // endless bounce with nothing on screen to explain it.
    const second = recoverAccessSession({ ...env, storage, now: env.now + 5_000 });
    expect(second).toBe("suppressed");
    expect(navigations).toHaveLength(1);
  });

  test("many rapid failures produce exactly one navigation", () => {
    const { env, navigations, storage } = environment();
    for (let i = 0; i < 25; i += 1) {
      recoverAccessSession({ ...env, storage, now: env.now + i * 100 });
    }
    expect(navigations).toHaveLength(1);
  });

  test("a concurrent burst of requests does not produce a navigation each", () => {
    // Every panel on a dashboard fetches at once; all of them meet the same
    // expired session.
    const { env, navigations, storage } = environment();
    const outcomes = Array.from({ length: 8 }, () =>
      recoverAccessSession({ ...env, storage, now: env.now }),
    );
    expect(outcomes.filter((o) => o === "navigated")).toHaveLength(1);
    expect(navigations).toHaveLength(1);
  });

  test("an expiry after the cooldown is recoverable again", () => {
    const { env, navigations, storage } = environment();
    recoverAccessSession(env);
    const later = recoverAccessSession({
      ...env,
      storage,
      now: env.now + REAUTH_COOLDOWN_MS + 1,
    });
    expect(later).toBe("navigated");
    expect(navigations).toHaveLength(2);
  });

  test("a different page is allowed its own attempt", () => {
    // Suppressing every route because one failed would strand an operator who
    // navigated somewhere else entirely.
    const { env, navigations, storage } = environment();
    recoverAccessSession(env);
    const other = recoverAccessSession({
      ...env,
      storage,
      href: "https://admin.cb67labs.api.br/applications",
      now: env.now + 1_000,
    });
    expect(other).toBe("navigated");
    expect(navigations).toHaveLength(2);
  });

  test("shouldReauthenticate is the whole loop rule, stated directly", () => {
    const at = 500;
    const key = routeKey(ADMIN_URL);
    expect(shouldReauthenticate(ADMIN_URL, at, null)).toBe(true);
    expect(shouldReauthenticate(ADMIN_URL, at, { key, at, doc: DOCUMENT_ID })).toBe(false);
    expect(
      shouldReauthenticate(ADMIN_URL, at + REAUTH_COOLDOWN_MS, { key, at, doc: DOCUMENT_ID }),
    ).toBe(true);
    expect(
      shouldReauthenticate("https://admin.cb67labs.api.br/x", at, { key, at, doc: DOCUMENT_ID }),
    ).toBe(true);
  });

  test("a fragment or a throwaway query parameter does not buy a fresh attempt", () => {
    // Keying on the full href let a router that touches either one take an
    // unlimited number of attempts, which defeated the cooldown entirely.
    const at = 500;
    const key = routeKey(ADMIN_URL);
    for (const href of [
      `${ADMIN_URL}#panel-a`,
      `${ADMIN_URL}#panel-b`,
      `${ADMIN_URL}?t=1`,
      `${ADMIN_URL}?t=2`,
      `${ADMIN_URL}/`,
    ]) {
      expect(`${href}: ${shouldReauthenticate(href, at + 1, { key, at, doc: DOCUMENT_ID })}`).toBe(
        `${href}: false`,
      );
    }
  });

  test("a clock that moved backwards does not suppress recovery indefinitely", () => {
    const key = routeKey(ADMIN_URL);
    expect(shouldReauthenticate(ADMIN_URL, 100, { key, at: 10_000, doc: DOCUMENT_ID })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// D — Access renewed
// ---------------------------------------------------------------------------

describe("D — once Access is renewed the guard resets", () => {
  test("a successful response clears the marker", () => {
    const { env, storage } = environment();
    recoverAccessSession(env);
    expect(readReauthRecord(storage)).not.toBeNull();

    // What the adapter does after any response that reached the origin. A
    // different document id means the recovery already completed.
    clearReauthRecord(storage, "document-after-recovery");
    expect(readReauthRecord(storage)).toBeNull();
  });

  test("after renewal a later expiry recovers immediately, not after a cooldown", () => {
    const { env, navigations, storage } = environment();
    recoverAccessSession(env);
    // The operator came back: a NEW document is running, so the marker belongs
    // to a previous one and is cleared.
    clearReauthRecord(storage, "document-after-recovery");

    const later = recoverAccessSession({ ...env, storage, now: env.now + 1_000 });
    expect(later).toBe("navigated");
    expect(navigations).toHaveLength(2);
  });
});

describe("a recovery in flight is not erased by a slow earlier request", () => {
  test("a marker written by THIS document survives a late success", () => {
    // The race: a request issued while Access was still valid lands after a
    // later one was intercepted, and clearing unconditionally wiped the marker
    // the interception had just written — re-enabling the loop.
    const { env, storage } = environment({ now: 2_000 });

    recoverAccessSession(env);
    clearReauthRecord(storage, DOCUMENT_ID); // the slow 200 arrives, same document

    expect(readReauthRecord(storage)).not.toBeNull();
    expect(shouldReauthenticate(ADMIN_URL, 2_500, readReauthRecord(storage))).toBe(false);
  });

  test("a marker from ANOTHER document is cleared", () => {
    const { storage } = environment();
    writeReauthRecord(storage, { key: routeKey(ADMIN_URL), at: 500, doc: "previous-document" });
    clearReauthRecord(storage, DOCUMENT_ID);
    expect(readReauthRecord(storage)).toBeNull();
  });

  test("a wall clock that moves backwards cannot make this document's marker clearable", () => {
    // The earlier rule compared the marker's Date.now() against the page's
    // performance.timeOrigin. Different clock bases: a backwards jump made a
    // marker written by this document look older than the document itself, and
    // a slow success then cleared a recovery still in flight.
    const { env, storage } = environment({ now: 1 }); // as if the clock rewound
    recoverAccessSession(env);
    clearReauthRecord(storage, DOCUMENT_ID);
    expect(readReauthRecord(storage)).not.toBeNull();
  });

  test("a marker of the old shape, without a document id, is discarded", () => {
    // Written by a build that predates this rule; treating it as belonging to
    // the current document would suppress a legitimate recovery.
    const storage = memoryStorage({
      [REAUTH_MARKER]: JSON.stringify({ key: routeKey(ADMIN_URL), at: 1 }),
    });
    expect(readReauthRecord(storage)).toBeNull();
    expect(shouldReauthenticate(ADMIN_URL, 2, readReauthRecord(storage))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Storage robustness
// ---------------------------------------------------------------------------

describe("the loop guard degrades rather than blocking recovery", () => {
  test("a corrupt marker is ignored", () => {
    const storage = memoryStorage({ [REAUTH_MARKER]: "{not json" });
    expect(readReauthRecord(storage)).toBeNull();
    const { navigations } = (() => {
      const nav: string[] = [];
      recoverAccessSession({
        href: ADMIN_URL,
        now: 1,
        documentId: DOCUMENT_ID,
        storage,
        navigate: (h) => void nav.push(h),
      });
      return { navigations: nav };
    })();
    expect(navigations).toHaveLength(1);
  });

  test("a marker of the wrong shape is ignored", () => {
    const storage = memoryStorage({
      [REAUTH_MARKER]: JSON.stringify({ key: 7, at: "soon", doc: 3 }),
    });
    expect(readReauthRecord(storage)).toBeNull();
  });

  test("a storage property that throws on access does not prevent recovery", () => {
    // Reading window.sessionStorage can itself throw SecurityError, before any
    // guarded method runs. That escaped and stranded the operator over a browser
    // setting that had nothing to do with Access.
    const hostile = {} as { sessionStorage: Storage };
    Object.defineProperty(hostile, "sessionStorage", {
      get() {
        throw new Error("SecurityError");
      },
    });
    expect(() => hostile.sessionStorage).toThrow();
    // browserRecoveryEnvironment substitutes a discarding store in this case;
    // the equivalent here is that recovery still navigates with such a store.
    const nav: string[] = [];
    expect(
      recoverAccessSession({
        href: ADMIN_URL,
        now: 1,
        documentId: DOCUMENT_ID,
        storage: { getItem: () => null, setItem: () => undefined, removeItem: () => undefined },
        navigate: (h) => void nav.push(h),
      }),
    ).toBe("navigated");
    expect(nav).toHaveLength(1);
  });

  test("storage whose methods throw does not prevent recovery", () => {
    const throwing = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    const nav: string[] = [];
    // Private browsing must not strand an operator. The cooldown is a guard
    // against looping, not a security control, so losing it is survivable.
    expect(
      recoverAccessSession({
        href: ADMIN_URL,
        now: 1,
        documentId: DOCUMENT_ID,
        storage: throwing,
        navigate: (h) => void nav.push(h),
      }),
    ).toBe("navigated");
    expect(nav).toHaveLength(1);
  });

  test("writeReauthRecord and clearReauthRecord round-trip", () => {
    const storage = memoryStorage();
    writeReauthRecord(storage, { key: routeKey(ADMIN_URL), at: 42, doc: DOCUMENT_ID });
    expect(readReauthRecord(storage)).toEqual({
      key: routeKey(ADMIN_URL),
      at: 42,
      doc: DOCUMENT_ID,
    });
    clearReauthRecord(storage, "another-document");
    expect(readReauthRecord(storage)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// E / F — the other failures stay themselves
// ---------------------------------------------------------------------------

describe("E and F — other failures are not reported as Access expiry", () => {
  test("E: a transport failure keeps the connectivity message", () => {
    const described = describeError(new TypeError("Failed to fetch"));
    expect(described.title).toBe("Dados indisponíveis");
    expect(described.title).not.toContain("Access");
  });

  test("E: a 502 from the origin keeps the service message", () => {
    expect(describeError(new HttpError(502, "", undefined, "v1/admin/overview")).title).toBe(
      "Serviço indisponível",
    );
  });

  test("F: a CB67 401 keeps its own message", () => {
    expect(formatError(new HttpError(401, "", undefined, "v1/admin/auth/login"))).toBe(
      "Usuário ou senha inválidos.",
    );
    expect(formatError(new HttpError(401, "", undefined, "v1/admin/overview"))).toBe(
      "Sessão expirada. Entre novamente para continuar.",
    );
  });

  test("the four situations produce four distinct messages", () => {
    const messages = new Set([
      formatError(new AccessSessionExpiredError()),
      formatError(new HttpError(401, "", undefined, "v1/admin/auth/login")),
      formatError(new HttpError(401, "", undefined, "v1/admin/overview")),
      formatError(new TypeError("Failed to fetch")),
    ]);
    expect(messages.size).toBe(4);
  });
});
