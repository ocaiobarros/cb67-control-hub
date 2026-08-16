import { describe, expect, test, beforeEach, afterEach } from "bun:test";

/**
 * CSRF behaviour tests for HttpAdapter.
 *
 * These assert the wire contract in docs/API-CONTRACTS.md. The security-critical
 * properties are the failure paths, not the happy path:
 *
 *  - a mutation must NEVER be sent without a token (fail closed)
 *  - only a CSRF-coded 403 may be retried; an authorization 403 must not be
 *
 * `src/config/env.ts` reads import.meta.env at module load, so the module is
 * imported dynamically after the environment is stubbed.
 */

type Call = { url: string; method: string; headers: Record<string, string>; body?: unknown };

let calls: Call[] = [];
let originalFetch: typeof globalThis.fetch;

function headersToObject(init: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!init) return out;
  new Headers(init).forEach((value, key) => {
    out[key.toLowerCase()] = value;
  });
  return out;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/** A 403 carrying the contractual CSRF error code — the only retryable 403. */
const csrfDenied = () => jsonResponse({ code: "csrf_token_invalid", message: "bad token" }, 403);
/** A 403 from an authorization decision — must never be retried. */
const authzDenied = () => jsonResponse({ code: "forbidden", message: "insufficient role" }, 403);

function stubFetch(handler: (call: Call, hitCount: number) => Response | Promise<Response>) {
  const hits = new Map<string, number>();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const call: Call = { url, method, headers: headersToObject(init?.headers), body: init?.body };
    calls.push(call);
    const key = `${method} ${url}`;
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    return handler(call, n);
  }) as typeof globalThis.fetch;
}

const mutations = () => calls.filter((c) => !c.url.includes("/auth/csrf"));
const tokenFetches = () => calls.filter((c) => c.url.includes("/auth/csrf"));

async function loadAdapter() {
  // Fresh module instance so the in-memory token cache does not leak between tests.
  const mod = await import(`./http-adapter.ts?t=${Math.random()}`);
  return mod as typeof import("./http-adapter");
}

beforeEach(() => {
  calls = [];
  originalFetch = globalThis.fetch;
  process.env["VITE_CB67_API_BASE_URL"] = "https://api.example.test/";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("CSRF — fail closed when a token cannot be obtained", () => {
  const failureCases: Array<[string, () => Response | Promise<Response>]> = [
    ["token endpoint returns 500", () => jsonResponse({ error: "boom" }, 500)],
    ["token endpoint returns 401", () => jsonResponse({ error: "no session" }, 401)],
    ["token endpoint returns 404", () => new Response("", { status: 404 })],
    [
      "token endpoint returns invalid JSON",
      () => new Response("<html>not json</html>", { status: 200 }),
    ],
    ["token endpoint returns no token field", () => jsonResponse({ ok: true })],
    ["token endpoint returns an empty token", () => jsonResponse({ token: "" })],
    ["token endpoint returns a non-string token", () => jsonResponse({ token: 12345 })],
    ["token endpoint returns an oversized token", () => jsonResponse({ token: "x".repeat(600) })],
  ];

  for (const [name, tokenResponse] of failureCases) {
    test(`${name} → mutation is never sent`, async () => {
      stubFetch((call) => {
        if (call.url.includes("/auth/csrf")) return tokenResponse();
        return jsonResponse({ ok: true });
      });
      const { request, CsrfError } = await loadAdapter();

      let thrown: unknown;
      try {
        await request("v1/admin/things", { method: "POST", body: JSON.stringify({ a: 1 }) });
      } catch (e) {
        thrown = e;
      }

      expect(thrown).toBeInstanceOf(CsrfError);
      expect(mutations()).toHaveLength(0); // the security prerequisite failed, so nothing was sent
    });
  }

  test("network failure fetching the token → mutation is never sent", async () => {
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      calls.push({ url, method: (init?.method ?? "GET").toUpperCase(), headers: {} });
      if (url.includes("/auth/csrf")) throw new TypeError("network down");
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    const { request, CsrfError } = await loadAdapter();

    let thrown: unknown;
    try {
      await request("v1/admin/things", { method: "POST" });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(CsrfError);
    expect(mutations()).toHaveLength(0);
  });

  test("a failed token fetch does not poison later attempts", async () => {
    let attempt = 0;
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) {
        attempt += 1;
        return attempt === 1 ? jsonResponse({}, 500) : jsonResponse({ token: "tok-ok" });
      }
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST" }).catch(() => undefined);
    await request("v1/admin/things", { method: "POST" }); // must succeed on a fresh token

    expect(mutations()).toHaveLength(1);
    expect(mutations()[0]?.headers["x-csrf-token"]).toBe("tok-ok");
  });
});

describe("CSRF — 403 classification", () => {
  test("a CSRF-coded 403 refreshes the token and retries exactly once", async () => {
    let issued = 0;
    stubFetch((call, hit) => {
      if (call.url.includes("/auth/csrf")) {
        issued += 1;
        return jsonResponse({ token: `tok-${issued}` });
      }
      return hit === 1 ? csrfDenied() : jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST" });

    expect(mutations()).toHaveLength(2);
    expect(mutations()[0]?.headers["x-csrf-token"]).toBe("tok-1");
    expect(mutations()[1]?.headers["x-csrf-token"]).toBe("tok-2");
  });

  test("an AUTHORIZATION 403 is NOT retried", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-a" });
      return authzDenied();
    });
    const { request, HttpError } = await loadAdapter();

    let thrown: unknown;
    try {
      await request("v1/admin/licenses/x/revoke", { method: "POST" });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as InstanceType<typeof HttpError>).status).toBe(403);
    // Replaying a denied privileged operation would pollute the audit trail.
    expect(mutations()).toHaveLength(1);
    expect(tokenFetches()).toHaveLength(1);
  });

  test("a 403 with an unparseable body is NOT retried", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-b" });
      return new Response("gateway denied", { status: 403 });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST" }).catch(() => undefined);

    expect(mutations()).toHaveLength(1);
  });

  test("a 403 with an unrelated code is NOT retried", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-c" });
      return jsonResponse({ code: "origin_rejected", message: "bad origin" }, 403);
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST" }).catch(() => undefined);

    expect(mutations()).toHaveLength(1);
  });

  test("a persistent CSRF 403 does not loop — exactly one retry", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-loop" });
      return csrfDenied();
    });
    const { request, HttpError } = await loadAdapter();

    let thrown: unknown;
    try {
      await request("v1/admin/things", { method: "POST" });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpError);
    expect(mutations()).toHaveLength(2);
  });

  test("a 403 on a GET is not retried and needs no token", async () => {
    stubFetch(() => authzDenied());
    const { request } = await loadAdapter();

    await request("v1/admin/overview").catch(() => undefined);

    expect(mutations()).toHaveLength(1);
    expect(tokenFetches()).toHaveLength(0);
  });
});

describe("CSRF — token lifecycle", () => {
  test("GET requests never fetch or send a token", async () => {
    stubFetch(() => jsonResponse({ ok: true }));
    const { request } = await loadAdapter();

    await request("v1/admin/overview");

    expect(tokenFetches()).toHaveLength(0);
    expect(mutations()[0]?.headers["x-csrf-token"]).toBeUndefined();
  });

  test("all mutating verbs carry the token", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-verb" });
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    for (const method of ["POST", "PUT", "PATCH", "DELETE"]) {
      await request("v1/admin/thing", { method });
    }

    expect(mutations()).toHaveLength(4);
    for (const m of mutations()) expect(m.headers["x-csrf-token"]).toBe("tok-verb");
  });

  test("the token is cached across mutations — fetched once", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-cached" });
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/a", { method: "POST" });
    await request("v1/admin/b", { method: "DELETE" });

    expect(tokenFetches()).toHaveLength(1);
  });

  test("concurrent mutations de-duplicate the token fetch", async () => {
    stubFetch(async (call) => {
      if (call.url.includes("/auth/csrf")) {
        await new Promise((r) => setTimeout(r, 10)); // widen the race window
        return jsonResponse({ token: "tok-concurrent" });
      }
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await Promise.all([
      request("v1/admin/a", { method: "POST" }),
      request("v1/admin/b", { method: "POST" }),
      request("v1/admin/c", { method: "POST" }),
    ]);

    expect(tokenFetches()).toHaveLength(1); // three mutations, one token request
    expect(mutations()).toHaveLength(3);
  });

  test("the request body survives a CSRF retry", async () => {
    const payload = JSON.stringify({ reason: "revogação solicitada" });
    stubFetch((call, hit) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: `tok-${hit}` });
      return hit === 1 ? csrfDenied() : jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST", body: payload });

    expect(mutations()).toHaveLength(2);
    expect(mutations()[0]?.body).toBe(payload);
    expect(mutations()[1]?.body).toBe(payload); // not consumed by the first attempt
  });

  test("logout clears the cached token so a new session gets a new one", async () => {
    let issued = 0;
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) {
        issued += 1;
        return jsonResponse({ token: `tok-${issued}` });
      }
      return jsonResponse({ ok: true });
    });
    const { httpAdapter, request } = await loadAdapter();

    await request("v1/admin/a", { method: "POST" }); // tok-1
    await httpAdapter.logout();
    await request("v1/admin/b", { method: "POST" }); // must fetch tok-2

    expect(tokenFetches()).toHaveLength(2);
    const last = mutations().at(-1);
    expect(last?.headers["x-csrf-token"]).toBe("tok-2");
  });

  test("every request sends credentials so the session cookie travels", async () => {
    const seen: Array<RequestCredentials | undefined> = [];
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      seen.push(init?.credentials);
      if (String(input).includes("/auth/csrf")) return jsonResponse({ token: "tok-cred" });
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    const { request } = await loadAdapter();

    await request("v1/admin/overview");
    await request("v1/admin/thing", { method: "POST" });

    expect(seen.length).toBeGreaterThanOrEqual(3); // read + token fetch + mutation
    for (const c of seen) expect(c).toBe("include");
  });
});
