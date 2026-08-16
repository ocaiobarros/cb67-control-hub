import type { TimeRange } from "@/types";
import { cn } from "@/lib/utils";

const RANGES: TimeRange[] = ["15m", "1h", "6h", "24h", "7d", "30d"];

export function TimeRangeSelect({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (range: TimeRange) => void;
}) {
  return (
    <div
      role="group"
      aria-label="Intervalo de tempo"
      className="inline-flex overflow-hidden rounded-md border border-border"
    >
      {RANGES.map((range) => (
        <button
          key={range}
          type="button"
          aria-pressed={value === range}
          onClick={() => onChange(range)}
          className={cn(
            "px-2.5 py-1 text-xs font-medium transition-colors",
            value === range
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {range}
        </button>
      ))}
    </div>
  );
}
