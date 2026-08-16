import type { ReactNode } from "react";
import { Inbox } from "lucide-react";

export function EmptyState({
  message,
  hint,
  action,
}: {
  message: string;
  hint?: string | undefined;
  action?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 py-10 text-center">
      <span className="liquid-subtle edge-light grid size-11 place-items-center rounded-full">
        <Inbox className="size-5 text-muted-foreground" aria-hidden />
      </span>
      <p className="text-sm font-medium">{message}</p>
      {hint && <p className="max-w-sm text-xs text-muted-foreground">{hint}</p>}
      {action}
    </div>
  );
}
