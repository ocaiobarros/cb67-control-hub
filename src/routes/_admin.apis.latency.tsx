import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatMs } from "@/utils/format";
import type { ApiEndpoint, LatencyBreakdown, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/apis/latency")({
  head: () => ({
    meta: [
      { title: "Latência da API — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Percentis de latência da API CB67 Labs divididos entre processamento interno e tempo do provedor upstream.",
      },
      { property: "og:title", content: "Latência da API — CB67 Labs Control Center" },
      { property: "og:description", content: "p50, p90, p95, p99 e tempos máximos de resposta." },
    ],
  }),
  component: LatencyPage,
});

const SCOPE_LABEL: Record<LatencyBreakdown["scope"], string> = {
  overall: "Ponta a ponta",
  internal: "Processamento da plataforma",
  provider: "Provedor upstream",
};

function LatencyPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const latency = useQuery(q.latency(range));
  const endpoints = useQuery(q.endpoints());

  const breakdown = latency.data?.breakdown ?? [];
  const overall = breakdown.find((row) => row.scope === "overall");
  const internal = breakdown.find((row) => row.scope === "internal");
  const provider = breakdown.find((row) => row.scope === "provider");

  const columns: Column<LatencyBreakdown>[] = [
    {
      id: "scope",
      header: "Escopo",
      cell: (row) => <span className="font-medium">{SCOPE_LABEL[row.scope]}</span>,
      sortValue: (row) => row.scope,
    },
    ...(["p50", "p90", "p95", "p99", "max"] as const).map<Column<LatencyBreakdown>>((key) => ({
      id: key,
      header: key === "max" ? "max" : key,
      cell: (row) => <span className="tabular">{formatMs(row[key])}</span>,
      sortValue: (row) => row[key],
      align: "right",
    })),
  ];

  const slowest: Column<ApiEndpoint>[] = [
    {
      id: "path",
      header: "Endpoint",
      cell: (row) => (
        <code className="mono-xs text-foreground">
          {row.method} {row.path}
        </code>
      ),
      sortValue: (row) => row.path,
    },
    {
      id: "p95",
      header: "p95",
      cell: (row) => <span className="tabular">{formatMs(row.p95Ms)}</span>,
      sortValue: (row) => row.p95Ms,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Latência da API"
        description="Os percentis são calculados apenas com requisições concluídas. O tempo do provedor é medido na fronteira da chamada de saída, para que a lentidão upstream possa ser separada da sobrecarga da plataforma."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="p50"
          value={overall ? formatMs(overall.p50) : "—"}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="p95"
          value={overall ? formatMs(overall.p95) : "—"}
          tone={overall && overall.p95 > 800 ? "warn" : "ok"}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="p99"
          value={overall ? formatMs(overall.p99) : "—"}
          tone={overall && overall.p99 > 2000 ? "crit" : "neutral"}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="Máximo"
          value={overall ? formatMs(overall.max) : "—"}
          hint="Requisição concluída mais lenta"
          isLoading={latency.isLoading}
        />
      </div>

      <ChartPanel
        title="Latência ao longo do tempo"
        description="Tempo de resposta agregado em todos os endpoints publicados."
        isLoading={latency.isLoading}
        error={latency.error ?? undefined}
        isEmpty={(latency.data?.series.length ?? 0) === 0}
        height={260}
      >
        <TimeSeriesChart
          data={latency.data?.series ?? []}
          series={[{ key: "value", label: "Latência" }]}
          variant="line"
          unit="ms"
        />
      </ChartPanel>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="space-y-3 xl:col-span-2">
          <SectionTitle
            title="Detalhamento por percentil"
            description="Contribuição interna versus upstream no total."
          />
          <DataTable
            data={latency.data?.breakdown}
            columns={columns}
            rowKey={(row) => row.scope}
            isLoading={latency.isLoading}
            error={latency.error ?? undefined}
            dense
          />
        </div>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Atribuição de orçamento</h3>
          <dl className="mt-2">
            <StatRow
              label="Parcela da plataforma"
              value={
                internal && overall ? `${((internal.p95 / overall.p95) * 100).toFixed(1)}%` : "—"
              }
            />
            <StatRow
              label="Parcela do provedor"
              value={
                provider && overall ? `${((provider.p95 / overall.p95) * 100).toFixed(1)}%` : "—"
              }
            />
            <StatRow label="Janela" value={range} />
            <StatRow label="Origem do percentil" value="Registros de requisição (provisório)" />
          </dl>
          <p className="mt-3 text-xs text-muted-foreground">
            A atribuição é indicativa até que o backend exponha tempos por span.
          </p>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Endpoints mais lentos"
          description="Classificados por p95 nas últimas 24 horas."
        />
        <DataTable
          data={[...(endpoints.data ?? [])].sort((a, b) => b.p95Ms - a.p95Ms).slice(0, 10)}
          columns={slowest}
          rowKey={(row) => row.id}
          isLoading={endpoints.isLoading}
          error={endpoints.error ?? undefined}
          dense
        />
      </div>
    </div>
  );
}
