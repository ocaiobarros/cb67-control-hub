import { AccessSessionExpiredError, HttpError } from "./http-adapter";

/**
 * Failures that must not be retried.
 *
 * Retrying is not free here. An expired Cloudflare Access session has already
 * triggered a full-page navigation, so every retry is another intercepted
 * request racing that navigation — and each one is a chance to disturb the
 * single-recovery guard. An authentication or authorization refusal repeated is
 * a denial written to the audit log again for no gain.
 */
export function isNonRetryable(error: unknown): boolean {
  if (error instanceof AccessSessionExpiredError) return true;
  if (error instanceof HttpError) {
    // 401 and 403 will not become 200 by asking again; 404 and 409 describe the
    // state of the resource, not a transient fault.
    return [400, 401, 403, 404, 409, 422].includes(error.status);
  }
  return false;
}
