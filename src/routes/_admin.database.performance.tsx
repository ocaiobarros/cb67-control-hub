import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatNumber, formatPercent } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/performance")({
  head: () => ({
    meta: [
      { title: "Database Performance — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Query throughput, cache efficiency and lock contention for the platform PostgreSQL cluster over a selectable window.",
      },
      { property: "og:title", content: "Database Performance — CB67 Labs Control Center" },
      { property: "og:description", content: "Throughput, cache efficiency and lock contention." },
    ],
  }),
  component: PerformancePage,
});

function PerformancePage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const db = health.data;

  const queries = (series.data ?? []).map((point) => Number(point["queries"] ?? 0));
  const locks = (series.data ?? []).map((point) => Number(point["locks"] ?? 0));
  const peakQueries = queries.length > 0 ? Math.max(...queries) : 0;
  const peakLocks = locks.length > 0 ? Math.max(...locks) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Performance"
        description="Throughput and contention indicators. Statement-level analysis stays in the database tooling; this surface tracks the signals that page an operator."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Queries/s"
          value={db ? formatNumber(db.queriesPerSec) : "—"}
          hint={`peak ${formatNumber(peakQueries)}`}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Transactions/s"
          value={db ? formatNumber(db.transactionsPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Cache hit ratio"
          value={db ? formatPercent(db.cacheHitRatio, 1) : "—"}
          tone={db && db.cacheHitRatio < 95 ? "warn" : "ok"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Peak locks"
          value={formatNumber(peakLocks)}
          tone={peakLocks > 12 ? "warn" : "ok"}
          isLoading={series.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Query throughput"
          description="Queries per second across all consumers."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart data={series.data ?? []} series={[{ key: "queries", label: "Queries/s" }]} />
        </ChartPanel>
        <ChartPanel
          title="Lock contention"
          description="Locks held during the selected window."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart data={series.data ?? []} series={[{ key: "locks", label: "Locks" }]} variant="line" />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Operating thresholds"
          description="Provisional targets to be confirmed with the backend team before alert rules are provisioned."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Cache hit ratio" value="≥ 99% steady state, warn below 95%" />
            <StatRow label="Deadlocks" value="0 tolerated; any occurrence raises an alert" />
            <StatRow label="Pool saturation" value="warn at 80%, critical at 92%" />
            <StatRow label="Long transactions" value="warn above 60s, kill above 300s" />
          </dl>
        </section>
      </div>
    </div>
  );
}
