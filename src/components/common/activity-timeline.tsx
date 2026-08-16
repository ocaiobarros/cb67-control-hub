import { formatDateTime, formatRelative } from "@/utils/format";
import { StatusBadge } from "./status-badge";
import { EmptyState } from "./empty-state";

export interface TimelineItem {
  id: string;
  at: string;
  title: string;
  detail?: string | undefined;
  status?: string | undefined;
}

export function ActivityTimeline({ items }: { items: TimelineItem[] }) {
  if (items.length === 0) return <EmptyState message="Nenhuma atividade registrada para este objeto." />;
  return (
    <ol className="relative space-y-4 border-l border-border pl-5">
      {items.map((item) => (
        <li key={item.id} className="relative">
          <span
            aria-hidden
            className="absolute top-1.5 -left-[1.4rem] size-2 rounded-full bg-primary"
          />
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium">{item.title}</p>
            {item.status && <StatusBadge status={item.status} />}
          </div>
          {item.detail && <p className="text-xs text-muted-foreground">{item.detail}</p>}
          <p className="mono-xs mt-0.5 text-muted-foreground">
            {formatDateTime(item.at)} · {formatRelative(item.at)}
          </p>
        </li>
      ))}
    </ol>
  );
}
