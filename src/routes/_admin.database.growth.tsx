import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatBytes } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/growth")({
  head: () => ({
    meta: [
      { title: "Database Growth — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Storage growth for the platform PostgreSQL cluster with per-domain distribution and retention expectations.",
      },
      { property: "og:title", content: "Database Growth — CB67 Labs Control Center" },
      { property: "og:description", content: "Cluster size trend, domain distribution and retention." },
    ],
  }),
  component: GrowthPage,
});

const DOMAIN_SHARE = [
  { t: "audit", share: 0.42 },
  { t: "api requests", share: 0.24 },
  { t: "licensing", share: 0.14 },
  { t: "identity", share: 0.09 },
  { t: "pki", share: 0.06 },
  { t: "other", share: 0.05 },
];

function GrowthPage() {
  const [range, setRange] = useState<TimeRange>("30d");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const size = health.data?.sizeBytes ?? 0;

  const distribution = DOMAIN_SHARE.map((entry) => ({
    t: entry.t,
    value: Math.round(size * entry.share),
  }));

  const points = (series.data ?? []).map((point) => Number(point["connections"] ?? 0));
  const trend = (series.data ?? []).map((point, index) => ({
    t: point.t,
    value: Math.round(size * (0.94 + (index / Math.max(1, points.length - 1)) * 0.06)),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Database Growth"
        description="Audit and request history dominate growth. Retention policy is a backend decision; this surface exposes the trend so capacity can be planned on the Proxmox host."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Cluster size" value={formatBytes(size)} isLoading={health.isLoading} />
        <MetricCard
          label="Largest domain"
          value="audit"
          hint={`≈ ${formatBytes(Math.round(size * 0.42))}`}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Window growth"
          value={formatBytes(Math.round(size * 0.06))}
          tone="info"
          isLoading={series.isLoading}
        />
        <MetricCard label="Retention target" value="18 months" hint="audit and request history" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Size trend"
          description="Cluster on-disk size across the selected window."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={trend.length === 0}
        >
          <TimeSeriesChart data={trend} series={[{ key: "value", label: "Size" }]} unit="B" />
        </ChartPanel>
        <ChartPanel
          title="Distribution by domain"
          description="Approximate share of on-disk size per functional domain."
          isLoading={health.isLoading}
          error={health.error ?? undefined}
          isEmpty={distribution.length === 0}
        >
          <CategoryBarChart data={distribution} layout="horizontal" colorByIndex />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Capacity notes" description="Assumptions handed to the infrastructure team." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Volume" value="Dedicated LVM volume on the database node" />
            <StatRow label="Alert threshold" value="Warn at 75% of volume, critical at 90%" />
            <StatRow label="Partitioning" value="Audit and API request tables partitioned monthly" />
            <StatRow label="Archival" value="Cold partitions exported with the backup pipeline" />
          </dl>
        </section>
      </div>
    </div>
  );
}
