import type { ReactNode } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { formatPercent } from "@/utils/format";
import { usePointerLight } from "@/hooks/use-pointer-light";
import type { StatusTone } from "./status-badge";

const TONE_TEXT: Record<StatusTone, string> = {
  ok: "text-ok",
  warn: "text-warn",
  crit: "text-crit",
  info: "text-info",
  neutral: "",
};

/**
 * Summary tile on the liquid material plane. The value settles into place on
 * change and a specular highlight tracks the pointer (see LIQUID-MATERIAL.md).
 */
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
  hint?: string | undefined;
  tone?: StatusTone | undefined;
  isLoading?: boolean | undefined;
  footer?: ReactNode | undefined;
}) {
  const { onPointerMove } = usePointerLight();

  return (
    <Card
      variant="metric"
      onPointerMove={onPointerMove}
      className="flex min-w-0 flex-col gap-1.5 p-4 lift"
    >
      <span className="text-section-title">{label}</span>
      {isLoading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <span
          key={String(value)}
          className={cn("value-settle truncate text-metric", TONE_TEXT[tone])}
        >
          {value}
        </span>
      )}
      {hint && <span className="text-caption">{hint}</span>}
      {footer}
    </Card>
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
  formatValue?: (value: number) => string | undefined;
  hint?: string | undefined;
}) {
  const pct = total > 0 ? Math.min(100, (used / total) * 100) : 0;
  const fmt = formatValue ?? ((v: number) => String(v));
  const { onPointerMove } = usePointerLight();

  return (
    <Card variant="metric" onPointerMove={onPointerMove} className="space-y-2.5 p-4">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-section-title">{label}</span>
        <span
          className={cn(
            "text-xs tabular font-medium",
            pct > 90 ? "text-crit" : pct > 75 ? "text-warn" : "text-muted-foreground",
          )}
        >
          {formatPercent(pct, 1)}
        </span>
      </div>
      <p className="text-xl font-semibold tabular tracking-tight">
        {fmt(used)}{" "}
        <span className="text-sm font-normal text-muted-foreground">/ {fmt(total)}</span>
      </p>
      <Progress
        value={pct}
        aria-label={`${label} usage`}
        className={cn(
          "h-1.5 bg-surface-muted [&>div]:transition-transform [&>div]:duration-500 [&>div]:ease-enter",
          pct > 90 && "[&>div]:bg-crit",
          pct > 75 && pct <= 90 && "[&>div]:bg-warn",
        )}
      />
      {hint && <p className="text-caption">{hint}</p>}
    </Card>
  );
}

export function StatRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border py-2.5 last:border-0">
      <dt className="text-section-title pt-0.5">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium break-words">{value}</dd>
    </div>
  );
}
