import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/utils/format";
import type { StatusTone } from "./status-badge";

export function MetricCard({
  label,
  value,
  hint,
  tone = "neutral",
  isLoading,
  footer,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: StatusTone;
  isLoading?: boolean;
  footer?: ReactNode;
}) {
  return (
    <div className="panel flex min-w-0 flex-col gap-1 p-4">
      <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </span>
      {isLoading ? (
        <Skeleton className="h-7 w-24" />
      ) : (
        <span
          className={cn(
            "truncate text-2xl font-semibold tabular",
            tone === "ok" && "text-ok",
            tone === "warn" && "text-warn",
            tone === "crit" && "text-crit",
            tone === "info" && "text-info",
          )}
        >
          {value}
        </span>
      )}
      {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      {footer}
    </div>
  );
}

export function UsageCard({
  label,
  used,
  total,
  formatValue,
  hint,
}: {
  label: string;
  used: number;
  total: number;
  formatValue?: (value: number) => string;
  hint?: string;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const fmt = formatValue ?? ((v: number) => String(v));
  return (
    <div className="panel space-y-2 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </span>
        <span className="text-xs tabular text-muted-foreground">{formatPercent(pct, 1)}</span>
      </div>
      <p className="text-lg font-semibold tabular">
        {fmt(used)} <span className="text-sm font-normal text-muted-foreground">/ {fmt(total)}</span>
      </p>
      <Progress
        value={pct}
        aria-label={`${label} usage`}
        className={cn(pct > 90 && "[&>div]:bg-crit", pct > 75 && pct <= 90 && "[&>div]:bg-warn")}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2 last:border-0">
      <dt className="text-xs tracking-wide text-muted-foreground uppercase">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">{value}</dd>
    </div>
  );
}
