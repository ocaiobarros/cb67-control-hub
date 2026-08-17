import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { isNonRetryable } from "@/api/retry-policy";

/**
 * React Query retries failed queries by default. Two of this app's failures
 * must not be retried:
 *
 *  - an expired Cloudflare Access session, because a full-page navigation to
 *    re-authenticate is already under way and each retry is another intercepted
 *    request racing it, and
 *  - an authentication or authorization refusal, because repeating it changes
 *    nothing and fills the audit log with denials.
 */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (isNonRetryable(error)) return false;
  return failureCount < 2;
}

export const getRouter = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: shouldRetry },
      mutations: { retry: false },
    },
  });

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    defaultPreloadStaleTime: 0,
  });

  return router;
};
