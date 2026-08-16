import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <Inbox className="size-6 text-muted-foreground" aria-hidden />
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
