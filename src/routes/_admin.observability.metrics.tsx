import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { MetricCard } from "@/components/common/metric-card";
import { cn } from "@/lib/utils";
import { formatCompact } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/observability/metrics")({
  head: () => ({
    meta: [
      { title: "Métricas — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Séries de métricas selecionadas da plataforma para requisições, latência, erros, CPU, memória e throughput de rede.",
      },
      { property: "og:title", content: "Métricas — CB67 Labs Control Center" },
      { property: "og:description", content: "Séries de métricas selecionadas com janela de tempo configurável." },
    ],
  }),
  component: MetricsPage,
});

const METRICS = [
  { key: "requests", label: "Requisições", unit: "req", description: "Requisições atendidas por intervalo." },
  { key: "latency", label: "Latência", unit: "ms", description: "Tempo de resposta agregado." },
  { key: "errors", label: "Erros", unit: "err", description: "Respostas com falha por intervalo." },
  { key: "cpu", label: "CPU", unit: "%", description: "Utilização de CPU do cluster." },
  { key: "memory", label: "Memória", unit: "%", description: "Utilização de memória do cluster." },
  { key: "network", label: "Rede", unit: "Mb/s", description: "Throughput agregado." },
] as const;

function MetricsPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const [selected, setSelected] = useState<string>(METRICS[0].key);
  const metric = useQuery(q.metricSeries(selected, range));

  const definition = METRICS.find((entry) => entry.key === selected) ?? METRICS[0];
  const points = metric.data ?? [];
  const values = points.map((point) => Number(point["value"] ?? 0));
  const latest = values[values.length - 1] ?? 0;
  const peak = values.length > 0 ? Math.max(...values) : 0;
  const average = values.length > 0 ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Métricas"
        description="Um subconjunto selecionado do catálogo de métricas da plataforma. Consultas ad-hoc permanecem na stack de observabilidade; esta superfície expõe apenas séries validadas."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div role="group" aria-label="Métrica" className="flex flex-wrap gap-2">
        {METRICS.map((entry) => (
          <button
            key={entry.key}
            type="button"
            aria-pressed={selected === entry.key}
            onClick={() => setSelected(entry.key)}
            className={cn(
              "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
              selected === entry.key
                ? "border-primary bg-accent text-accent-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {entry.label}
          </button>
        ))}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Último valor"
          value={`${formatCompact(latest)} ${definition.unit}`}
          isLoading={metric.isLoading}
        />
        <MetricCard
          label="Média da janela"
          value={`${formatCompact(average)} ${definition.unit}`}
          isLoading={metric.isLoading}
        />
        <MetricCard
          label="Pico da janela"
          value={`${formatCompact(peak)} ${definition.unit}`}
          isLoading={metric.isLoading}
        />
      </div>

      <ChartPanel
        title={definition.label}
        description={definition.description}
        isLoading={metric.isLoading}
        error={metric.error ?? undefined}
        isEmpty={points.length === 0}
        height={320}
      >
        <TimeSeriesChart
          data={points}
          series={[{ key: "value", label: definition.label }]}
          variant="line"
          unit={definition.unit}
        />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Catálogo de séries"
          description="Os identificadores de métrica são estáveis e correspondem às chaves publicadas pelo coletor."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {METRICS.map((entry) => (
            <div key={entry.key} className="panel space-y-1 p-4">
              <code className="mono-xs text-foreground">{entry.key}</code>
              <p className="text-sm font-medium">{entry.label}</p>
              <p className="text-xs text-muted-foreground">{entry.description}</p>
              <p className="mono-xs text-muted-foreground">unidade: {entry.unit}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
