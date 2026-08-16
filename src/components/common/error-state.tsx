import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HttpError } from "@/api/http-adapter";

/**
 * Maps transport failures to operator-facing copy. Raw fetch errors and stack
 * traces are never surfaced to the user.
 */
export function describeError(error: unknown): { title: string; detail: string } {
  if (error instanceof HttpError) {
    switch (error.status) {
      case 401:
        return { title: "Session expired", detail: "Sign in again to continue." };
      case 403:
        return {
          title: "Access denied",
          detail: "Your role does not allow this operation.",
        };
      case 404:
        return { title: "Not found", detail: "The requested resource no longer exists." };
      case 409:
        return { title: "Conflict", detail: "The resource changed. Reload and retry." };
      case 422:
        return { title: "Invalid request", detail: "Some fields were rejected by the server." };
      case 429:
        return {
          title: "Rate limit exceeded",
          detail: "Too many requests. Wait a moment before retrying.",
        };
      case 502:
      case 503:
        return {
          title: "Service unavailable",
          detail: "The management API is not reachable right now.",
        };
      default:
        return { title: "Request failed", detail: "The management API returned an error." };
    }
  }
  return {
    title: "Data unavailable",
    detail: "The management API could not be reached. Check connectivity and retry.",
  };
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { title, detail } = describeError(error);
  return (
    <div
      role="alert"
      className="flex flex-col items-center gap-2 rounded-lg border border-crit/30 bg-crit/5 px-6 py-8 text-center"
    >
      <AlertTriangle className="size-6 text-crit" aria-hidden />
      <p className="text-sm font-semibold">{title}</p>
      <p className="max-w-sm text-xs text-muted-foreground">{detail}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry} className="mt-2">
          Retry
        </Button>
      )}
    </div>
  );
}
