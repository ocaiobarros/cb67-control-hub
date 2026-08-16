import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Single source of truth for status colour semantics across every screen.
 * Status is never communicated by colour alone — a dot plus the label is used.
 */
const badge = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        ok: "border-ok/30 bg-ok/10 text-ok",
        warn: "border-warn/35 bg-warn/12 text-warn",
        crit: "border-crit/30 bg-crit/10 text-crit",
        info: "border-info/30 bg-info/10 text-info",
        neutral: "border-border bg-muted text-muted-foreground",
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
  label?: string;
  className?: string;
  tone?: StatusTone;
}) {
  const resolved = tone ?? statusTone(status);
  return (
    <span className={cn(badge({ tone: resolved }), className)}>
      <span
        aria-hidden
        className={cn(
          "size-1.5 rounded-full",
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
    <span className="mono-xs rounded border border-border bg-muted px-1.5 py-0.5 font-medium text-muted-foreground">
      {method}
    </span>
  );
}
