import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatMs, formatMsOrNull, NOT_MEASURED } from "@/utils/format";
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

/**
 * A share of a total, or absence.
 *
 * Both terms must be measured, and the denominator must be non-zero: without
 * either the result is not a percentage of anything. The previous form
 * required only that both objects existed, which said nothing about whether
 * their percentiles had values.
 */
function sharePercent(part: number | null, whole: number | null): string {
  if (part === null || whole === null || whole === 0) return NOT_MEASURED;
  return `${((part / whole) * 100).toFixed(1)}%`;
}

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
      cell: (row) => <span className="tabular">{formatMsOrNull(row[key])}</span>,
      sortValue: (row) => row[key] ?? -1,
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
      cell: (row) => <span className="tabular">{formatMsOrNull(row.p95Ms)}</span>,
      sortValue: (row) => row.p95Ms ?? -1,
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
          value={formatMsOrNull(overall?.p50 ?? null)}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="p95"
          value={formatMsOrNull(overall?.p95 ?? null)}
          tone={overall?.p95 != null && overall.p95 > 800 ? "warn" : "ok"}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="p99"
          value={formatMsOrNull(overall?.p99 ?? null)}
          tone={overall?.p99 != null && overall.p99 > 2000 ? "crit" : "neutral"}
          isLoading={latency.isLoading}
        />
        <MetricCard
          label="Máximo"
          value={formatMsOrNull(overall?.max ?? null)}
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
              value={sharePercent(internal?.p95 ?? null, overall?.p95 ?? null)}
            />
            <StatRow
              label="Parcela do provedor"
              value={sharePercent(provider?.p95 ?? null, overall?.p95 ?? null)}
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
          // Only endpoints with a measured p95 can be ranked by it. Coercing a
          // null to 0 would seat every unobserved endpoint at the fast end of a
          // table whose whole purpose is to name the slow ones.
          data={[...(endpoints.data ?? [])]
            .filter((e): e is typeof e & { p95Ms: number } => e.p95Ms !== null)
            .sort((a, b) => b.p95Ms - a.p95Ms)
            .slice(0, 10)}
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
