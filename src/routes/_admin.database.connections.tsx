import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatNumber } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/connections")({
  head: () => ({
    meta: [
      { title: "Database Connections — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Connection pool utilisation for the platform PostgreSQL cluster, with headroom and pooler expectations per consumer.",
      },
      { property: "og:title", content: "Database Connections — CB67 Labs Control Center" },
      { property: "og:description", content: "Pool utilisation, headroom and consumer expectations." },
    ],
  }),
  component: ConnectionsPage,
});

const CONSUMERS = [
  { name: "api-gateway", pool: "transaction pooling", expected: "40% of pool" },
  { name: "licensing-service", pool: "transaction pooling", expected: "25% of pool" },
  { name: "identity-service", pool: "session pooling", expected: "15% of pool" },
  { name: "audit-writer", pool: "transaction pooling", expected: "10% of pool" },
  { name: "maintenance jobs", pool: "direct", expected: "10% of pool" },
];

function ConnectionsPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const db = health.data;

  const points = (series.data ?? []).map((point) => Number(point["connections"] ?? 0));
  const peak = points.length > 0 ? Math.max(...points) : 0;
  const average = points.length > 0 ? points.reduce((sum, value) => sum + value, 0) / points.length : 0;
  const headroom = (db?.maxConnections ?? 0) - peak;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Connections"
        description="Connection exhaustion is the most common failure mode for the platform. Every service is expected to connect through the pooler with a bounded pool size."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Current" value={db ? formatNumber(db.connections) : "—"} isLoading={health.isLoading} />
        <MetricCard label="Window average" value={formatNumber(Math.round(average))} isLoading={series.isLoading} />
        <MetricCard label="Window peak" value={formatNumber(peak)} isLoading={series.isLoading} />
        <MetricCard
          label="Headroom at peak"
          value={formatNumber(Math.max(0, headroom))}
          tone={headroom < 10 ? "crit" : headroom < 25 ? "warn" : "ok"}
          isLoading={series.isLoading || health.isLoading}
        />
      </div>

      <UsageCard
        label="Pool utilisation"
        used={db?.connections ?? 0}
        total={db?.maxConnections ?? 0}
        formatValue={(value) => formatNumber(value)}
        hint="max_connections is enforced by the cluster; the pooler must stay below it with room for maintenance sessions."
      />

      <ChartPanel
        title="Active backends"
        description="Connection count over the selected window."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={(series.data?.length ?? 0) === 0}
        height={300}
      >
        <TimeSeriesChart data={series.data ?? []} series={[{ key: "connections", label: "Connections" }]} />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Expected consumers"
          description="Provisional allocation contract for the backend team; actual per-consumer counters are not yet exposed."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONSUMERS.map((consumer) => (
            <div key={consumer.name} className="panel p-4">
              <code className="mono-xs text-foreground">{consumer.name}</code>
              <dl className="mt-2">
                <StatRow label="Mode" value={consumer.pool} />
                <StatRow label="Budget" value={consumer.expected} />
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
