import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for status colour semantics across every screen.
 * Status is never communicated by colour alone — a dot plus the label is used.
 */
const badge = cva(
  "relative inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[0.6875rem] font-semibold tracking-wide whitespace-nowrap backdrop-blur-[10px] transition-colors",
  {
    variants: {
      tone: {
        ok: "border-ok/30 bg-ok/12 text-ok",
        warn: "border-warn/35 bg-warn/12 text-warn",
        crit: "border-crit/35 bg-crit/14 text-crit",
        info: "border-info/30 bg-info/10 text-info",
        neutral: "border-border bg-surface-raised text-muted-foreground",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export type StatusTone = NonNullable<VariantProps<typeof badge>["tone"]>;

const TONE_MAP: Record<string, StatusTone> = {
  active: "ok",
  healthy: "ok",
  valid: "ok",
  verified: "ok",
  passed: "ok",
  operational: "ok",
  success: "ok",
  allowed: "ok",
  resolved: "ok",
  degraded: "warn",
  grace: "warn",
  pending: "warn",
  suspended: "warn",
  maintenance: "warn",
  acknowledged: "warn",
  monitoring: "warn",
  identified: "warn",
  warn: "warn",
  low: "warn",
  medium: "warn",
  expired: "crit",
  revoked: "crit",
  unavailable: "crit",
  critical: "crit",
  failed: "crit",
  failure: "crit",
  denied: "crit",
  firing: "crit",
  error: "crit",
  high: "crit",
  investigating: "crit",
  info: "info",
  disabled: "neutral",
  debug: "neutral",
};

export function statusTone(status: string): StatusTone {
  return TONE_MAP[status.toLowerCase()] ?? "neutral";
}

export function StatusBadge({
  status,
  label,
  className,
  tone,
}: {
  status: string;
  label?: string | undefined;
  className?: string | undefined;
  tone?: StatusTone | undefined;
}) {
  const resolved = tone ?? statusTone(status);
  return (
    <span className={cn(badge({ tone: resolved }), className)}>
      <span
        aria-hidden
        className={cn(
          "relative size-1.5 rounded-full",
          resolved === "crit" && "status-pulse",
          resolved === "ok" && "bg-ok",
          resolved === "warn" && "bg-warn",
          resolved === "crit" && "bg-crit",
          resolved === "info" && "bg-info",
          resolved === "neutral" && "bg-neutral",
        )}
      />
      {(label ?? status).toUpperCase()}
    </span>
  );
}

export function HttpStatusBadge({ status }: { status: number }) {
  const tone: StatusTone =
    status >= 500 ? "crit" : status === 429 ? "warn" : status >= 400 ? "warn" : "ok";
  return <StatusBadge status={String(status)} tone={tone} />;
}

export function MethodBadge({ method }: { method: string }) {
  return (
    <span className="mono-xs rounded-md border border-border bg-surface-raised px-1.5 py-0.5 font-medium text-muted-foreground">
      {method}
    </span>
  );
}
