/**
 * Client-side preconditions for a login attempt.
 *
 * These live outside the component so the rule and the request are one unit
 * that can be exercised directly. Validating inside the submit handler works
 * until someone adds a second caller.
 *
 * The browser's `required` attribute is deliberately not relied on: its message
 * cannot be worded, and it accepts a field containing only spaces.
 */

export const MISSING_USERNAME = "Informe o operador.";
export const MISSING_PASSWORD = "Informe a senha.";

/**
 * Returns the operator-facing problem with the supplied credentials, or null
 * when the attempt is worth sending.
 *
 * Username is trimmed because whitespace is not a username. Password is NOT
 * trimmed — a leading or trailing space may be part of it, and silently
 * altering what someone typed produces a failure they cannot explain.
 */
export function credentialProblem(username: string, password: string): string | null {
  if (!username.trim()) return MISSING_USERNAME;
  if (!password) return MISSING_PASSWORD;
  return null;
}

export type LoginOutcome<T> =
  { ok: true; result: T } | { ok: false; message: string; sent: boolean };

/**
 * Applies the preconditions and then performs the login.
 *
 * A request that cannot succeed is never sent. This is not tidiness: an empty
 * username returns the same 401 as a wrong password, so sending it would report
 * "usuário ou senha inválidos" to someone who simply left a field blank.
 *
 * `sent` reports whether the network was reached, so a caller — and a test —
 * can tell a rejected precondition from a rejected credential.
 */
export async function submitLogin<T>(
  input: { username: string; password: string },
  login: (input: { username: string; password: string }) => Promise<T>,
  describe: (error: unknown) => string,
): Promise<LoginOutcome<T>> {
  const problem = credentialProblem(input.username, input.password);
  if (problem) {
    return { ok: false, message: problem, sent: false };
  }
  try {
    return { ok: true, result: await login(input) };
  } catch (cause) {
    return { ok: false, message: describe(cause), sent: true };
  }
}
