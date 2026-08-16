import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/empty-state";
import { ErrorState } from "@/components/common/error-state";
import { formatCompact, formatTime } from "@/utils/format";
import type { MetricPoint } from "@/types";

export interface SeriesConfig {
  key: string;
  label: string;
  color?: string | undefined;
}

const PALETTE = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

const axisProps = {
  stroke: "var(--muted-foreground)",
  tick: { fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "var(--popover)",
    border: "1px solid var(--border)",
    borderRadius: "8px",
    fontSize: "12px",
    color: "var(--popover-foreground)",
  },
  labelStyle: { color: "var(--muted-foreground)" },
} as const;

function labelFor(value: string) {
  return value.includes("T") && value.endsWith("Z") ? formatTime(value) : value;
}

export function ChartPanel({
  title,
  description,
  isLoading,
  error,
  isEmpty,
  actions,
  height = 220,
  children,
}: {
  title: string;
  description?: string | undefined;
  isLoading?: boolean | undefined;
  error?: unknown | undefined;
  isEmpty?: boolean | undefined;
  actions?: ReactNode | undefined;
  height?: number | undefined;
  children: ReactNode;
}) {
  return (
    <section className="panel flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold">{title}</h3>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        {actions}
      </div>
      <div style={{ height }} className="w-full min-w-0">
        {error ? (
          <ErrorState error={error} />
        ) : isLoading ? (
          <Skeleton className="size-full" />
        ) : isEmpty ? (
          <div className="flex h-full items-center justify-center">
            <EmptyState message="No data in this period." />
          </div>
        ) : (
          children
        )}
      </div>
    </section>
  );
}

export function TimeSeriesChart({
  data,
  series,
  variant = "area",
  unit,
}: {
  data: MetricPoint[];
  series: SeriesConfig[];
  variant?: "area" | "line" | undefined;
  unit?: string | undefined;
}) {
  const Chart = variant === "area" ? AreaChart : LineChart;
  return (
    <ResponsiveContainer width="100%" height="100%">
      <Chart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="t" tickFormatter={labelFor} {...axisProps} minTickGap={24} />
        <YAxis tickFormatter={(v: number) => formatCompact(v)} {...axisProps} width={48} />
        <Tooltip
          {...tooltipStyle}
          labelFormatter={labelFor}
          formatter={(value: number, name: string) => [
            `${formatCompact(value)}${unit ? ` ${unit}` : ""}`,
            series.find((s) => s.key === name)?.label ?? name,
          ]}
        />
        {series.length > 1 && (
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 11 }}
            formatter={(value: string) => series.find((s) => s.key === value)?.label ?? value}
          />
        )}
        {series.map((s, i) =>
          variant === "area" ? (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              fill={s.color ?? PALETTE[i % PALETTE.length]}
              fillOpacity={0.14}
              strokeWidth={1.8}
              dot={false}
            />
          ) : (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              stroke={s.color ?? PALETTE[i % PALETTE.length]}
              strokeWidth={1.8}
              dot={false}
            />
          ),
        )}
      </Chart>
    </ResponsiveContainer>
  );
}

export function CategoryBarChart({
  data,
  dataKey = "value",
  layout = "vertical",
  colorByIndex,
}: {
  data: MetricPoint[];
  dataKey?: string | undefined;
  layout?: "vertical" | "horizontal" | undefined;
  colorByIndex?: boolean | undefined;
}) {
  const horizontal = layout === "horizontal";
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data}
        layout={horizontal ? "vertical" : "horizontal"}
        margin={{ top: 4, right: 12, left: horizontal ? 8 : -16, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={horizontal} horizontal={!horizontal} />
        <XAxis
          {...(horizontal
            ? { type: "number" as const, tickFormatter: (v: number) => formatCompact(v) }
            : { dataKey: "t" })}
          {...axisProps}
        />
        <YAxis
          {...(horizontal
            ? { type: "category" as const, dataKey: "t", width: 120 }
            : { tickFormatter: (v: number) => formatCompact(v), width: 48 })}
          {...axisProps}
        />
        <Tooltip {...tooltipStyle} formatter={(value: number) => formatCompact(value)} />
        <Bar dataKey={dataKey} radius={3} fill="var(--chart-1)">
          {colorByIndex &&
            data.map((entry, i) => <Cell key={String(entry.t)} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DonutChart({ data, dataKey = "value" }: { data: MetricPoint[]; dataKey?: string }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          dataKey={dataKey}
          nameKey="t"
          innerRadius="55%"
          outerRadius="80%"
          paddingAngle={2}
          stroke="var(--card)"
        >
          {data.map((entry, i) => (
            <Cell key={String(entry.t)} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip {...tooltipStyle} formatter={(value: number) => formatCompact(value)} />
      </PieChart>
    </ResponsiveContainer>
  );
}
