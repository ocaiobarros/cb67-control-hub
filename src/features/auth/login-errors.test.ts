import { describe, expect, test, beforeEach, afterEach } from "bun:test";
// Statically imported: this module reads no environment, so it needs none of
// the dynamic-reload dance the adapter requires.
import {
  credentialProblem,
  submitLogin,
  MISSING_USERNAME,
  MISSING_PASSWORD,
} from "./login-validation";
// Statically imported so the HttpError constructed here is the SAME class that
// describeError checks with `instanceof`. Loading each module through a
// cache-busting dynamic import produced two distinct classes, and every
// classification silently fell through to the non-HTTP fallback — the tests
// failed for a reason that had nothing to do with the behaviour under test.
import { HttpError } from "@/api/http-adapter";
import { describeError, formatError } from "@/components/common/error-state";

/**
 * Regression tests for how a failed login is reported to the operator.
 *
 * Three situations produced the same message and are genuinely different:
 *
 *  - the credentials were rejected      -> "Usuário ou senha inválidos."
 *  - the session ended                  -> "Sessão expirada. Entre novamente…"
 *  - a required field is empty          -> "Informe o operador." / "…a senha."
 *
 * All three used to reach the operator as "Sessão expirada", which told someone
 * who had mistyped their password to log in again — the thing they were already
 * doing. The empty-field case is worse than cosmetic: it sent a request that
 * could only fail, so a blank username was reported as a wrong password.
 *
 * These assert the classification, not the wording of unrelated statuses.
 */

type Call = { url: string; method: string };

let calls: Call[] = [];
let originalFetch: typeof globalThis.fetch;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function stubFetch(handler: (call: Call) => Response | Promise<Response>) {
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const call: Call = {
      url: String(input),
      method: (init?.method ?? "GET").toUpperCase(),
    };
    calls.push(call);
    return handler(call);
  }) as typeof globalThis.fetch;
}

async function loadAdapter() {
  const mod = await import(`../../api/http-adapter.ts?t=${Math.random()}`);
  return mod as typeof import("../../api/http-adapter");
}

beforeEach(() => {
  calls = [];
  originalFetch = globalThis.fetch;
  process.env["VITE_CB67_API_BASE_URL"] = "https://api.example.test/";
});

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("401 on a login attempt is a credential rejection, not an expired session", () => {
  test("POST /auth/login carries its path so the message can be correct", async () => {
    const { httpAdapter } = await loadAdapter();
    stubFetch((call) =>
      call.url.includes("/auth/csrf")
        ? jsonResponse({ token: "t" })
        : jsonResponse({ code: "unauthorized", message: "Credenciais inválidas." }, 401),
    );

    const err = await httpAdapter
      .login({ username: "caio", password: "wrong" })
      .then(() => null)
      .catch((e: unknown) => e);

    // A freshly loaded adapter has its own class identity, so assert the shape
    // rather than the constructor: what matters is that the status and the path
    // both arrive.
    const thrown = err as { status?: number; path?: string; name?: string };
    expect(thrown.name).toBe("HttpError");
    expect(thrown.status).toBe(401);
    expect(thrown.path).toContain("/auth/login");
  });

  test("the operator is told the credentials were wrong", async () => {
    const err = new HttpError(401, "", undefined, "v1/admin/auth/login");

    expect(describeError(err).title).toBe("Usuário ou senha inválidos.");
    expect(formatError(err)).toBe("Usuário ou senha inválidos.");
    expect(formatError(err)).not.toContain("Sessão expirada");
  });

  test("a rejected second factor is also a credential rejection", async () => {
    const err = new HttpError(401, "", undefined, "v1/admin/auth/mfa/verify");

    expect(formatError(err)).toBe("Usuário ou senha inválidos.");
  });
});

describe("401 elsewhere is an expired session", () => {
  test("the session endpoint reports expiry", async () => {
    const err = new HttpError(401, "", undefined, "v1/admin/auth/session");

    expect(describeError(err).title).toBe("Sessão expirada.");
    expect(formatError(err)).toBe("Sessão expirada. Entre novamente para continuar.");
  });

  test("a protected endpoint reports expiry", async () => {
    for (const path of [
      "v1/admin/overview",
      "v1/admin/iam/administrators",
      "v1/admin/applications",
    ]) {
      expect(formatError(new HttpError(401, "", undefined, path))).toBe(
        "Sessão expirada. Entre novamente para continuar.",
      );
    }
  });

  test("a 401 with no path recorded falls back to expiry rather than blaming credentials", async () => {
    // Accusing an operator of a wrong password when the cause is unknown is the
    // worse of the two mistakes: it invites them to re-enter a correct password
    // repeatedly. Expiry at least directs them somewhere useful.
    expect(formatError(new HttpError(401, ""))).toBe(
      "Sessão expirada. Entre novamente para continuar.",
    );
  });

  test("a protected path that merely contains the word login is not misread", async () => {
    expect(formatError(new HttpError(401, "", undefined, "v1/admin/security/login-attempts"))).toBe(
      "Sessão expirada. Entre novamente para continuar.",
    );
  });

  test("a trailing slash or query string does not change the classification", async () => {
    expect(formatError(new HttpError(401, "", undefined, "v1/admin/auth/login/"))).toBe(
      "Usuário ou senha inválidos.",
    );
    expect(
      formatError(new HttpError(401, "", undefined, "v1/admin/auth/login?next=/overview")),
    ).toBe("Usuário ou senha inválidos.");
  });
});

describe("other statuses keep their existing copy", () => {
  test("403 is still an authorization denial, not a session or credential problem", async () => {
    const msg = formatError(new HttpError(403, "", undefined, "v1/admin/overview"));
    expect(msg).toBe("Acesso negado: Sua função não permite esta operação.");
    expect(msg).not.toContain("Sessão expirada");
    expect(msg).not.toContain("Usuário ou senha");
  });

  test("a label-style title keeps its colon separator", async () => {
    expect(formatError(new HttpError(404, ""))).toBe(
      "Não encontrado: O recurso solicitado não existe mais.",
    );
  });
});

describe("required fields are validated before anything is sent", () => {
  test("an empty username is named as such", () => {
    expect(credentialProblem("", "secret")).toBe(MISSING_USERNAME);
    expect(MISSING_USERNAME).toBe("Informe o operador.");
  });

  test("a whitespace-only username is empty", () => {
    // The browser's `required` accepts this, which is why it is not relied on.
    expect(credentialProblem("   ", "secret")).toBe(MISSING_USERNAME);
    expect(credentialProblem("\t\n", "secret")).toBe(MISSING_USERNAME);
  });

  test("an empty password is named as such", () => {
    expect(credentialProblem("caio", "")).toBe(MISSING_PASSWORD);
    expect(MISSING_PASSWORD).toBe("Informe a senha.");
  });

  test("the username is reported first when both are empty", () => {
    // Reporting both at once, or the second one, would move the operator's
    // attention past the field they must fix first.
    expect(credentialProblem("", "")).toBe(MISSING_USERNAME);
  });

  test("a password of only spaces is accepted, because it may be the password", () => {
    // Trimming here would reject a legitimate password and give the operator a
    // failure they cannot account for.
    expect(credentialProblem("caio", "   ")).toBeNull();
  });

  test("complete credentials pass", () => {
    expect(credentialProblem("caio", "s3nha")).toBeNull();
  });

  test("nothing is invoked when a field is empty", async () => {
    let attempts = 0;
    const login = async () => {
      attempts += 1;
      return false;
    };

    const blankUser = await submitLogin({ username: "", password: "x" }, login, () => "unused");
    expect(blankUser.ok).toBe(false);
    expect(blankUser.ok === false && blankUser.attempted).toBe(false);
    expect(blankUser.ok === false && blankUser.message).toBe(MISSING_USERNAME);

    const blankPassword = await submitLogin(
      { username: "caio", password: "" },
      login,
      () => "unused",
    );
    expect(blankPassword.ok).toBe(false);
    expect(blankPassword.ok === false && blankPassword.attempted).toBe(false);
    expect(blankPassword.ok === false && blankPassword.message).toBe(MISSING_PASSWORD);

    expect(attempts).toBe(0);
  });

  test("a rejected credential IS sent, and is reported differently from an empty field", async () => {
    let attempts = 0;
    const login = async () => {
      attempts += 1;
      throw new HttpError(401, "", undefined, "v1/admin/auth/login");
    };

    const outcome = await submitLogin({ username: "caio", password: "wrong" }, login, formatError);

    expect(attempts).toBe(1);
    expect(outcome.ok).toBe(false);
    expect(outcome.ok === false && outcome.attempted).toBe(true);
    expect(outcome.ok === false && outcome.message).toBe("Usuário ou senha inválidos.");
  });

  test("the three situations produce three distinct messages", async () => {
    const messages = new Set([
      credentialProblem("", "x"),
      credentialProblem("caio", ""),
      formatError(new HttpError(401, "", undefined, "v1/admin/auth/login")),
      formatError(new HttpError(401, "", undefined, "v1/admin/auth/session")),
    ]);

    // The defect being guarded against was four situations collapsing onto one
    // message. If any two of these ever coincide again, this fails.
    expect(messages.size).toBe(4);
  });
});
