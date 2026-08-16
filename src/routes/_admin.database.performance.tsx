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
      { title: "Desempenho do Banco de Dados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Throughput de consultas, eficiência de cache e contenção de locks do cluster PostgreSQL da plataforma em uma janela selecionável.",
      },
      { property: "og:title", content: "Desempenho do Banco de Dados — CB67 Labs Control Center" },
      { property: "og:description", content: "Throughput, eficiência de cache e contenção de locks." },
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
        title="Desempenho do Banco de Dados"
        description="Indicadores de throughput e contenção. A análise em nível de statement permanece nas ferramentas do banco de dados; esta superfície acompanha os sinais que acionam um operador."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Consultas/s"
          value={db ? formatNumber(db.queriesPerSec) : "—"}
          hint={`pico ${formatNumber(peakQueries)}`}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Transações/s"
          value={db ? formatNumber(db.transactionsPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Taxa de acerto de cache"
          value={db ? formatPercent(db.cacheHitRatio, 1) : "—"}
          tone={db && db.cacheHitRatio < 95 ? "warn" : "ok"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Pico de locks"
          value={formatNumber(peakLocks)}
          tone={peakLocks > 12 ? "warn" : "ok"}
          isLoading={series.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Throughput de consultas"
          description="Consultas por segundo em todos os consumidores."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart data={series.data ?? []} series={[{ key: "queries", label: "Consultas/s" }]} />
        </ChartPanel>
        <ChartPanel
          title="Contenção de locks"
          description="Locks mantidos durante a janela selecionada."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart data={series.data ?? []} series={[{ key: "locks", label: "Locks" }]} variant="line" />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Limites operacionais"
          description="Metas provisórias a serem confirmadas com a equipe de backend antes de provisionar regras de alerta."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Taxa de acerto de cache" value="≥ 99% em regime estável, aviso abaixo de 95%" />
            <StatRow label="Deadlocks" value="0 tolerado; qualquer ocorrência gera um alerta" />
            <StatRow label="Saturação do pool" value="aviso em 80%, crítico em 92%" />
            <StatRow label="Transações longas" value="aviso acima de 60s, encerramento acima de 300s" />
          </dl>
        </section>
      </div>
    </div>
  );
}
