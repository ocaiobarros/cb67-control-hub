import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { formatNumber } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/connections")({
  head: () => ({
    meta: [
      { title: "Conexões do Banco de Dados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Utilização do pool de conexões do cluster PostgreSQL da plataforma, com margem e expectativas de pooler por consumidor.",
      },
      { property: "og:title", content: "Conexões do Banco de Dados — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Utilização do pool, margem e expectativas de consumidores.",
      },
    ],
  }),
  component: ConnectionsPage,
});

const CONSUMERS = [
  { name: "api-gateway", pool: "pooling por transação", expected: "40% do pool" },
  { name: "licensing-service", pool: "pooling por transação", expected: "25% do pool" },
  { name: "identity-service", pool: "pooling por sessão", expected: "15% do pool" },
  { name: "audit-writer", pool: "pooling por transação", expected: "10% do pool" },
  { name: "maintenance jobs", pool: "direto", expected: "10% do pool" },
];

function ConnectionsPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const db = health.data;

  const points = (series.data ?? []).map((point) => Number(point["connections"] ?? 0));
  const peak = points.length > 0 ? Math.max(...points) : 0;
  const average =
    points.length > 0 ? points.reduce((sum, value) => sum + value, 0) / points.length : 0;
  const headroom = (db?.maxConnections ?? 0) - peak;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Conexões do Banco de Dados"
        description="O esgotamento de conexões é o modo de falha mais comum da plataforma. Espera-se que todo serviço se conecte pelo pooler com um tamanho de pool limitado."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Atual"
          value={db ? formatNumber(db.connections) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Média da janela"
          value={formatNumber(Math.round(average))}
          isLoading={series.isLoading}
        />
        <MetricCard
          label="Pico da janela"
          value={formatNumber(peak)}
          isLoading={series.isLoading}
        />
        <MetricCard
          label="Margem no pico"
          value={formatNumber(Math.max(0, headroom))}
          tone={headroom < 10 ? "crit" : headroom < 25 ? "warn" : "ok"}
          isLoading={series.isLoading || health.isLoading}
        />
      </div>

      <UsageCard
        label="Utilização do pool"
        used={db?.connections ?? 0}
        total={db?.maxConnections ?? 0}
        formatValue={(value) => formatNumber(value)}
        hint="max_connections é imposto pelo cluster; o pooler deve ficar abaixo dele com espaço para sessões de manutenção."
      />

      <ChartPanel
        title="Backends ativos"
        description="Contagem de conexões na janela selecionada."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={(series.data?.length ?? 0) === 0}
        height={300}
      >
        <TimeSeriesChart
          data={series.data ?? []}
          series={[{ key: "connections", label: "Conexões" }]}
        />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Consumidores esperados"
          description="Contrato de alocação provisório para a equipe de backend; contadores reais por consumidor ainda não estão expostos."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CONSUMERS.map((consumer) => (
            <div key={consumer.name} className="panel p-4">
              <code className="mono-xs text-foreground">{consumer.name}</code>
              <dl className="mt-2">
                <StatRow label="Modo" value={consumer.pool} />
                <StatRow label="Orçamento" value={consumer.expected} />
              </dl>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
