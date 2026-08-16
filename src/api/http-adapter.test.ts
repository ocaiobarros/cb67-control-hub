import { describe, expect, test, beforeEach, afterEach } from "bun:test";

/**
 * CSRF behaviour tests for HttpAdapter.
 *
 * These assert the wire contract in docs/API-CONTRACTS.md: mutations carry
 * X-CSRF-Token, reads do not, and a 403 on a mutation triggers exactly one
 * token refresh and retry.
 *
 * `src/config/env.ts` reads import.meta.env at module load, so the module is
 * imported dynamically after the environment is stubbed.
 */

type Call = { url: string; method: string; headers: Record<string, string> };

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

/** Installs a fetch stub driven by a per-path handler map. */
function stubFetch(handler: (call: Call, hitCount: number) => Response) {
  const hits = new Map<string, number>();
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    const call: Call = { url, method, headers: headersToObject(init?.headers) };
    calls.push(call);
    const key = `${method} ${url}`;
    const n = (hits.get(key) ?? 0) + 1;
    hits.set(key, n);
    return handler(call, n);
  }) as typeof globalThis.fetch;
}

async function loadAdapter() {
  // Fresh module instance so the in-memory CSRF cache does not leak across tests.
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

describe("CSRF token handling", () => {
  test("GET requests do not fetch or send a CSRF token", async () => {
    stubFetch(() => jsonResponse({ ok: true }));
    const { request } = await loadAdapter();

    await request("v1/admin/overview");

    expect(calls).toHaveLength(1);
    expect(calls[0]?.method).toBe("GET");
    expect(calls[0]?.headers["x-csrf-token"]).toBeUndefined();
    expect(calls.some((c) => c.url.includes("/auth/csrf"))).toBe(false);
  });

  test("POST fetches a token and sends it as X-CSRF-Token", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-123" });
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const csrfCall = calls.find((c) => c.url.includes("/auth/csrf"));
    const mutation = calls.find((c) => c.method === "POST");
    expect(csrfCall).toBeDefined();
    expect(mutation?.headers["x-csrf-token"]).toBe("tok-123");
  });

  test("the token is cached — a second mutation does not refetch it", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-cached" });
      return jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/a", { method: "POST" });
    await request("v1/admin/b", { method: "DELETE" });

    const csrfFetches = calls.filter((c) => c.url.includes("/auth/csrf"));
    expect(csrfFetches).toHaveLength(1);
    expect(calls.filter((c) => c.headers["x-csrf-token"] === "tok-cached")).toHaveLength(2);
  });

  test("a 403 on a mutation refreshes the token and retries exactly once", async () => {
    let issued = 0;
    stubFetch((call, hit) => {
      if (call.url.includes("/auth/csrf")) {
        issued += 1;
        return jsonResponse({ token: `tok-${issued}` });
      }
      // First attempt rejected, second accepted.
      return hit === 1 ? jsonResponse({ error: "csrf" }, 403) : jsonResponse({ ok: true });
    });
    const { request } = await loadAdapter();

    await request("v1/admin/things", { method: "POST" });

    const mutations = calls.filter((c) => c.method === "POST" && !c.url.includes("/auth/csrf"));
    expect(mutations).toHaveLength(2);
    expect(mutations[0]?.headers["x-csrf-token"]).toBe("tok-1");
    expect(mutations[1]?.headers["x-csrf-token"]).toBe("tok-2");
    expect(issued).toBe(2);
  });

  test("a persistent 403 does not loop — it throws after one retry", async () => {
    stubFetch((call) => {
      if (call.url.includes("/auth/csrf")) return jsonResponse({ token: "tok-x" });
      return jsonResponse({ error: "denied" }, 403);
    });
    const { request, HttpError } = await loadAdapter();

    let thrown: unknown;
    try {
      await request("v1/admin/things", { method: "POST" });
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(HttpError);
    expect((thrown as InstanceType<typeof HttpError>).status).toBe(403);
    const mutations = calls.filter((c) => c.method === "POST" && !c.url.includes("/auth/csrf"));
    expect(mutations).toHaveLength(2); // original + one retry, never more
  });

  test("a 403 on a GET is not retried", async () => {
    stubFetch(() => jsonResponse({ error: "forbidden" }, 403));
    const { request } = await loadAdapter();

    await request("v1/admin/overview").catch(() => undefined);

    const reads = calls.filter((c) => c.method === "GET" && !c.url.includes("/auth/csrf"));
    expect(reads).toHaveLength(1);
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

    const mutations = calls.filter((c) => !c.url.includes("/auth/csrf"));
    expect(mutations).toHaveLength(4);
    for (const m of mutations) {
      expect(m.headers["x-csrf-token"]).toBe("tok-verb");
    }
  });

  test("requests always include credentials so the session cookie is sent", async () => {
    let sawCredentials: RequestCredentials | undefined;
    globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
      sawCredentials = init?.credentials;
      return jsonResponse({ ok: true });
    }) as typeof globalThis.fetch;
    const { request } = await loadAdapter();

    await request("v1/admin/overview");

    expect(sawCredentials).toBe("include");
  });
});
