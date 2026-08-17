import { describe, expect, test, beforeEach, afterEach } from "bun:test";

/**
 * The same recovery, exercised through the real request path rather than the
 * pure helpers, so the wiring is covered and not only the rules.
 *
 * Scenarios A–G from the change request. The adapter is loaded dynamically
 * because `src/config/env.ts` reads import.meta.env at module load.
 */

type Call = { url: string; method: string; redirect: RequestRedirect | undefined };

let calls: Call[] = [];
let originalFetch: typeof globalThis.fetch;
let originalWindow: unknown;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * What the browser hands back when it stops at a redirect: opaque, status 0,
 * no readable headers. A real Response cannot be constructed with this type,
 * and the adapter only reads `type` and `status` before rejecting, so the
 * shape is sufficient and honest about what is actually available.
 */
const opaqueRedirect = () =>
  ({ type: "opaqueredirect", status: 0, ok: false }) as unknown as Response;

function stubFetch(handler: (call: Call) => Response) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: (init?.method ?? "GET").toUpperCase(),
      redirect: init?.redirect,
    };
    calls.push(call);
    return handler(call);
  }) as typeof globalThis.fetch;
}

function fakeBrowser(timeOrigin = 0) {
  const navigations: string[] = [];
  const store = new Map<string, string>();
  const win = {
    location: {
      href: "https://admin.cb67labs.api.br/overview",
      origin: "https://admin.cb67labs.api.br",
      assign: (href: string) => void navigations.push(href),
    },
    sessionStorage: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
    // When this document started loading. A page that came back from the Access
    // round trip is a NEW document with a later origin, which is how a finished
    // recovery is told apart from one still in flight.
    performance: { timeOrigin },
  };
  (globalThis as { window?: unknown }).window = win;
  return {
    navigations,
    store,
    /** Simulates the browser returning from Access with a fresh document. */
    reload: () => {
      win.performance.timeOrigin = Date.now() + 1;
    },
  };
}

async function loadAdapter() {
  const mod = await import(`./http-adapter.ts?t=${Math.random()}`);
  return mod as typeof import("./http-adapter");
}

const isCsrf = (c: Call) => c.url.includes("/auth/csrf");

beforeEach(() => {
  calls = [];
  originalFetch = globalThis.fetch;
  originalWindow = (globalThis as { window?: unknown }).window;
  process.env["VITE_CB67_API_BASE_URL"] = "https://admin.cb67labs.api.br/";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
  (globalThis as { window?: unknown }).window = originalWindow;
});

describe("requests stop at redirects instead of following them into a CORS failure", () => {
  test("every request is issued with redirect: manual", async () => {
    const { httpAdapter } = await loadAdapter();
    stubFetch((c) => (isCsrf(c) ? jsonResponse({ token: "t" }) : jsonResponse({ ok: true })));

    await httpAdapter.currentUser();
    await httpAdapter.logout();

    expect(calls.length).toBeGreaterThan(0);
    for (const call of calls) {
      expect(`${call.url} -> ${call.redirect}`).toBe(`${call.url} -> manual`);
    }
  });
});

describe("A — Access valid and CB67 session valid", () => {
  test("the call succeeds and nothing is reported", async () => {
    const { httpAdapter } = await loadAdapter();
    stubFetch(() => jsonResponse({ id: "1", name: "Caio Barros", role: "owner" }));

    await expect(httpAdapter.currentUser()).resolves.toMatchObject({ role: "owner" });
  });

  test("a successful response clears a marker left by a completed recovery", async () => {
    // timeOrigin is later than the marker, so the marker belongs to a previous
    // document: the recovery finished and the browser came back.
    const { store } = fakeBrowser(5_000);
    store.set("cb67:access-reauth", JSON.stringify({ key: "x", at: 1 }));

    const { httpAdapter } = await loadAdapter();
    stubFetch(() => jsonResponse({ role: "owner" }));

    await httpAdapter.currentUser();
    expect(store.get("cb67:access-reauth")).toBeUndefined();
  });
});

describe("B — Access valid, CB67 session expired", () => {
  test("a CB67 401 surfaces as an HTTP error, not as Access expiry", async () => {
    const { httpAdapter, HttpError, AccessSessionExpiredError } = await loadAdapter();
    stubFetch(() => jsonResponse({ code: "unauthorized" }, 401));

    const err = await httpAdapter
      .currentUser()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(err).not.toBeInstanceOf(AccessSessionExpiredError);
    expect((err as InstanceType<typeof HttpError>).status).toBe(401);
  });

  test("a CB67 401 does not navigate anywhere — CB67 login is the app's own route", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter } = await loadAdapter();
    stubFetch(() => jsonResponse({ code: "unauthorized" }, 401));

    await httpAdapter.currentUser().catch(() => undefined);
    expect(navigations).toHaveLength(0);
  });
});

describe("C — Access expired during use", () => {
  test("an intercepted request throws AccessSessionExpiredError", async () => {
    const { httpAdapter, AccessSessionExpiredError } = await loadAdapter();
    stubFetch(() => opaqueRedirect());

    const err = await httpAdapter
      .currentUser()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AccessSessionExpiredError);
  });

  test("it navigates the top-level window back to the current admin URL", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter } = await loadAdapter();
    stubFetch(() => opaqueRedirect());

    await httpAdapter.currentUser().catch(() => undefined);

    expect(navigations).toEqual(["https://admin.cb67labs.api.br/overview"]);
  });

  test("interception during the CSRF fetch is reported as Access expiry, not CSRF failure", async () => {
    // The token fetch is the first call of every mutation, so it is where an
    // expired session is usually met. A CsrfError here would send the operator
    // looking for an entirely different problem.
    const { httpAdapter, AccessSessionExpiredError, CsrfError } = await loadAdapter();
    stubFetch((c) => (isCsrf(c) ? opaqueRedirect() : jsonResponse({ ok: true })));

    const err = await httpAdapter
      .logout()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AccessSessionExpiredError);
    expect(err).not.toBeInstanceOf(CsrfError);
  });

  test("no mutation is sent when the token fetch was intercepted", async () => {
    const { httpAdapter } = await loadAdapter();
    stubFetch((c) => (isCsrf(c) ? opaqueRedirect() : jsonResponse({ ok: true })));

    await httpAdapter.logout().catch(() => undefined);

    // Fail closed is unchanged: the mutation never reaches the network.
    expect(calls.filter((c) => !isCsrf(c))).toHaveLength(0);
  });
});

describe("D — Access renewed", () => {
  test("after a successful call on the returned page, a later expiry navigates again", async () => {
    const browser = fakeBrowser();
    const { httpAdapter } = await loadAdapter();

    let intercept = true;
    stubFetch(() => (intercept ? opaqueRedirect() : jsonResponse({ role: "owner" })));

    await httpAdapter.currentUser().catch(() => undefined);
    expect(browser.navigations).toHaveLength(1);

    // The operator signed in to Access; the browser comes back with a NEW
    // document, which is what makes the old marker clearable.
    browser.reload();
    intercept = false;
    await httpAdapter.currentUser();

    // A genuine expiry later must not be suppressed by the stale marker.
    intercept = true;
    await httpAdapter.currentUser().catch(() => undefined);
    expect(browser.navigations).toHaveLength(2);
  });

  test("a slow success from the SAME document does not clear a recovery in flight", async () => {
    // The race the guard exists for: a request issued while Access was still
    // valid lands after a later one was intercepted. Clearing on it would
    // re-arm the loop.
    const browser = fakeBrowser(Date.now() - 10_000);
    const { httpAdapter } = await loadAdapter();

    let intercept = true;
    stubFetch(() => (intercept ? opaqueRedirect() : jsonResponse({ role: "owner" })));

    await httpAdapter.currentUser().catch(() => undefined);
    expect(browser.navigations).toHaveLength(1);

    intercept = false;
    await httpAdapter.currentUser(); // the slow 200 arrives, same document

    intercept = true;
    await httpAdapter.currentUser().catch(() => undefined);
    expect(browser.navigations).toHaveLength(1);
  });
});

describe("E — backend offline is not Access expiry", () => {
  test("a transport failure propagates unchanged and does not navigate", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter, AccessSessionExpiredError } = await loadAdapter();
    globalThis.fetch = (async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof globalThis.fetch;

    const err = await httpAdapter
      .currentUser()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(TypeError);
    expect(err).not.toBeInstanceOf(AccessSessionExpiredError);
    expect(navigations).toHaveLength(0);
  });

  test("a 502 is not Access expiry and does not navigate", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter, HttpError, AccessSessionExpiredError } = await loadAdapter();
    stubFetch(() => jsonResponse({ error: "bad gateway" }, 502));

    const err = await httpAdapter
      .currentUser()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(err).not.toBeInstanceOf(AccessSessionExpiredError);
    expect(navigations).toHaveLength(0);
  });
});

describe("G — no redirect loop through the adapter", () => {
  test("repeated interceptions produce exactly one navigation", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter } = await loadAdapter();
    stubFetch(() => opaqueRedirect());

    for (let i = 0; i < 10; i += 1) {
      await httpAdapter.currentUser().catch(() => undefined);
    }

    expect(navigations).toHaveLength(1);
  });

  test("a dashboard's concurrent panels produce one navigation between them", async () => {
    const { navigations } = fakeBrowser();
    const { httpAdapter } = await loadAdapter();
    stubFetch(() => opaqueRedirect());

    await Promise.all(
      Array.from({ length: 6 }, () => httpAdapter.currentUser().catch(() => undefined)),
    );

    expect(navigations).toHaveLength(1);
  });

  test("with no browser present nothing navigates and the error still describes itself", async () => {
    // SSR: there is no window to navigate. Throwing is still correct.
    (globalThis as { window?: unknown }).window = undefined;
    const { httpAdapter, AccessSessionExpiredError } = await loadAdapter();
    stubFetch(() => opaqueRedirect());

    const err = await httpAdapter
      .currentUser()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(err).toBeInstanceOf(AccessSessionExpiredError);
  });
});
