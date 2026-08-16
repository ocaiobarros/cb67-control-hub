import { cn } from "@/lib/utils";

const TONES: Record<string, string> = {
  GET: "border-info/40 text-info",
  POST: "border-ok/40 text-ok",
  PUT: "border-warn/40 text-warn",
  PATCH: "border-warn/40 text-warn",
  DELETE: "border-crit/40 text-crit",
};

export function MethodBadge({ method, className }: { method: string; className?: string }) {
  const upper = method.toUpperCase();
  return (
    <span
      className={cn(
        "mono-xs inline-flex w-14 shrink-0 items-center justify-center rounded border px-1 py-0.5 font-medium",
        TONES[upper] ?? "border-border text-muted-foreground",
        className,
      )}
    >
      {upper}
    </span>
  );
}

export function StatusCodeBadge({ code }: { code: number }) {
  const tone =
    code >= 500
      ? "border-crit/40 text-crit"
      : code >= 400
        ? "border-warn/40 text-warn"
        : "border-ok/40 text-ok";
  return (
    <span
      className={cn(
        "mono-xs inline-flex items-center justify-center rounded border px-1.5 py-0.5 font-medium",
        tone,
      )}
    >
      {code}
    </span>
  );
}
