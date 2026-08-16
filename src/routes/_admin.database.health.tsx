import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { StatusBadge } from "@/components/common/status-badge";
import { formatBytes, formatNumber, formatPercent } from "@/utils/format";
import { platformMeta } from "@/config/env";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/health")({
  head: () => ({
    meta: [
      { title: "Database Health — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "PostgreSQL health for the CB67 Labs platform: connection pool, throughput, cache hit ratio, locks and deadlocks.",
      },
      { property: "og:title", content: "Database Health — CB67 Labs Control Center" },
      { property: "og:description", content: "PostgreSQL connection pool, throughput and lock health." },
    ],
  }),
  component: DatabaseHealthPage,
});

function DatabaseHealthPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const db = health.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Health"
        description="A single PostgreSQL cluster backs the platform: licensing, identity, audit and API metadata. Metrics come from the database exporter, never from direct queries issued by this UI."
        meta={db ? <StatusBadge status={db.status} /> : undefined}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Transactions/s"
          value={db ? formatNumber(db.transactionsPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Queries/s"
          value={db ? formatNumber(db.queriesPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Cache hit ratio"
          value={db ? formatPercent(db.cacheHitRatio, 1) : "—"}
          tone={db && db.cacheHitRatio < 95 ? "warn" : "ok"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Deadlocks"
          value={db ? db.deadlocks : "—"}
          tone={db && db.deadlocks > 0 ? "crit" : "ok"}
          isLoading={health.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageCard
          label="Connection pool"
          used={db?.connections ?? 0}
          total={db?.maxConnections ?? 0}
          formatValue={(value) => formatNumber(value)}
          hint="Pool saturation above 80% indicates a leaking client or an undersized pooler."
        />
        <UsageCard
          label="Cluster size"
          used={db?.sizeBytes ?? 0}
          total={Math.max(db?.sizeBytes ?? 0, 512 * 1024 ** 3)}
          formatValue={(value) => formatBytes(value)}
          hint="Provisioned volume for the database mount on the Proxmox host."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Connections"
          description="Active backends over the selected window."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={series.data ?? []}
            series={[{ key: "connections", label: "Connections" }]}
          />
        </ChartPanel>
        <ChartPanel
          title="Query throughput and locks"
          description="Queries per second against lock contention."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={series.data ?? []}
            series={[
              { key: "queries", label: "Queries/s" },
              { key: "locks", label: "Locks" },
            ]}
            variant="line"
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Cluster facts" description="Deployment characteristics relevant to operators." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Engine" value="PostgreSQL (on-premises)" />
            <StatRow label="Host platform" value="Debian 13 on Proxmox" />
            <StatRow label="Exposure" value="Management network only" />
            <StatRow label="Locks held" value={db ? formatNumber(db.locks) : "—"} />
            <StatRow label="Platform" value={<code className="mono-xs">{platformMeta.publicDomain}</code>} />
          </dl>
        </section>
      </div>
    </div>
  );
}
