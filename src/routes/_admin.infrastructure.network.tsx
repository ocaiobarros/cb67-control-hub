import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCompact, formatDateTime, formatNumber } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/network")({
  head: () => ({
    meta: [
      { title: "Rede — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Throughput de entrada e saída, postura de borda e estado do firewall para a plataforma on-premises da CB67 Labs.",
      },
      { property: "og:title", content: "Rede — CB67 Labs Control Center" },
      { property: "og:description", content: "Throughput, postura de borda e estado do firewall." },
    ],
  }),
  component: NetworkPage,
});

function NetworkPage() {
  const [range, setRange] = useState<TimeRange>("6h");
  const series = useQuery(q.networkSeries(range));
  const firewall = useQuery(q.firewall());

  const last = series.data?.[series.data.length - 1];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rede"
        description="Tráfego atravessando o proxy reverso e a borda mTLS. O throughput é expresso em Mbit/s conforme reportado pelos contadores de interface."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Entrada"
          value={last ? `${formatCompact(Number(last["rx"]))} Mbit/s` : "—"}
          isLoading={series.isLoading}
        />
        <MetricCard
          label="Saída"
          value={last ? `${formatCompact(Number(last["tx"]))} Mbit/s` : "—"}
          isLoading={series.isLoading}
        />
        <MetricCard
          label="Regras de firewall"
          value={firewall.data ? formatNumber(firewall.data.rulesCount) : "—"}
          hint={firewall.data?.policy}
          isLoading={firewall.isLoading}
        />
        <MetricCard
          label="Bloqueios recentes"
          value={firewall.data ? formatNumber(firewall.data.recentBlocks) : "—"}
          tone={firewall.data && firewall.data.recentBlocks > 100 ? "warn" : "neutral"}
          hint="Conexões descartadas na última hora"
          isLoading={firewall.isLoading}
        />
      </div>

      <ChartPanel
        title="Throughput de interface"
        description="Taxas de recepção e transmissão no uplink da plataforma."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={series.data?.length === 0}
        height={300}
      >
        <TimeSeriesChart
          data={series.data ?? []}
          unit="Mbit/s"
          series={[
            { key: "rx", label: "Entrada" },
            { key: "tx", label: "Saída" },
          ]}
        />
      </ChartPanel>

      <section className="panel p-4">
        <div className="flex items-center justify-between gap-3 pb-2">
          <h2 className="text-sm font-semibold">Postura de borda</h2>
          {firewall.data && <StatusBadge status={firewall.data.status} />}
        </div>
        <dl>
          <StatRow label="Política padrão" value={firewall.data?.policy ?? "—"} />
          <StatRow
            label="Última recarga"
            value={firewall.data ? formatDateTime(firewall.data.lastReloadAt) : "—"}
          />
          <StatRow
            label="Regras ativas"
            value={firewall.data ? formatNumber(firewall.data.rulesCount) : "—"}
          />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          A configuração do firewall é gerenciada fora desta interface. Os valores exibidos são
          relatórios somente leitura fornecidos pelo plano de controle da plataforma.
        </p>
      </section>
    </div>
  );
}
