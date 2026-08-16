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
      { title: "CPU e Memória — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Tendências de CPU, memória e load average para o cluster on-premises da CB67 Labs.",
      },
      { property: "og:title", content: "CPU e Memória — CB67 Labs Control Center" },
      { property: "og:description", content: "Tendências de uso de computação no cluster." },
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
        title="CPU e Memória"
        description="Pressão de computação nos nós do cluster. Valores sustentados acima de 85% indicam necessidade de revisão de capacidade."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="CPU média"
          value={avg("cpu") === undefined ? "—" : formatPercent(avg("cpu")!, 1)}
          isLoading={hosts.isLoading}
        />
        <MetricCard
          label="Memória média"
          value={avg("memory") === undefined ? "—" : formatPercent(avg("memory")!, 1)}
          isLoading={hosts.isLoading}
        />
        <MetricCard
          label="Nós reportando"
          value={hosts.data?.length ?? "—"}
          hint="Métricas coletadas pelo node exporter"
          isLoading={hosts.isLoading}
        />
      </div>

      <ChartPanel
        title="Uso ao longo do tempo"
        description="Pressão de CPU, memória e disco, média geral do cluster."
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
            { key: "memory", label: "Memória" },
            { key: "storage", label: "Armazenamento" },
          ]}
        />
      </ChartPanel>
    </div>
  );
}
