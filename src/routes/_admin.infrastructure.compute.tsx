import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { formatPercent } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/compute")({
  head: () => ({
    meta: [
      { title: "CPU & Memory — CB67 Labs Control Center" },
      {
        name: "description",
        content: "CPU, memory and load average trends for the CB67 Labs on-premises cluster.",
      },
      { property: "og:title", content: "CPU & Memory — CB67 Labs Control Center" },
      { property: "og:description", content: "Compute utilisation trends across the cluster." },
    ],
  }),
  component: ComputePage,
});

function ComputePage() {
  const [range, setRange] = useState<TimeRange>("6h");
  const series = useQuery(q.resourceSeries(range));
  const hosts = useQuery(q.hosts());

  const avg = (key: "cpu" | "memory" | "storage") => {
    const rows = hosts.data ?? [];
    if (rows.length === 0) return undefined;
    return rows.reduce((sum, host) => sum + host[key], 0) / rows.length;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="CPU & Memory"
        description="Compute pressure across cluster nodes. Sustained values above 85% indicate the need for capacity review."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Avg CPU"
          value={avg("cpu") === undefined ? "—" : formatPercent(avg("cpu")!, 1)}
          isLoading={hosts.isLoading}
        />
        <MetricCard
          label="Avg memory"
          value={avg("memory") === undefined ? "—" : formatPercent(avg("memory")!, 1)}
          isLoading={hosts.isLoading}
        />
        <MetricCard
          label="Nodes reporting"
          value={hosts.data?.length ?? "—"}
          hint="Metrics collected by node exporter"
          isLoading={hosts.isLoading}
        />
      </div>

      <ChartPanel
        title="Utilisation over time"
        description="CPU, memory and disk pressure, cluster-wide average."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={series.data?.length === 0}
        height={300}
      >
        <TimeSeriesChart
          data={series.data ?? []}
          variant="line"
          unit="%"
          series={[
            { key: "cpu", label: "CPU" },
            { key: "memory", label: "Memory" },
            { key: "storage", label: "Storage" },
          ]}
        />
      </ChartPanel>
    </div>
  );
}
