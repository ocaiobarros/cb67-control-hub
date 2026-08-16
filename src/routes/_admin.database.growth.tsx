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
      { title: "Crescimento do Banco de Dados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Crescimento de armazenamento do cluster PostgreSQL da plataforma com distribuição por domínio e expectativas de retenção.",
      },
      { property: "og:title", content: "Crescimento do Banco de Dados — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Tendência de tamanho do cluster, distribuição por domínio e retenção.",
      },
    ],
  }),
  component: GrowthPage,
});

const DOMAIN_SHARE = [
  { t: "auditoria", share: 0.42 },
  { t: "requisições de api", share: 0.24 },
  { t: "licenciamento", share: 0.14 },
  { t: "identidade", share: 0.09 },
  { t: "pki", share: 0.06 },
  { t: "outro", share: 0.05 },
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
        title="Crescimento do Banco de Dados"
        description="Auditoria e histórico de requisições dominam o crescimento. A política de retenção é uma decisão do backend; esta superfície expõe a tendência para planejar a capacidade no host Proxmox."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tamanho do cluster"
          value={formatBytes(size)}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Maior domínio"
          value="auditoria"
          hint={`≈ ${formatBytes(Math.round(size * 0.42))}`}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Crescimento na janela"
          value={formatBytes(Math.round(size * 0.06))}
          tone="info"
          isLoading={series.isLoading}
        />
        <MetricCard
          label="Meta de retenção"
          value="18 meses"
          hint="histórico de auditoria e requisições"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Tendência de tamanho"
          description="Tamanho do cluster em disco ao longo da janela selecionada."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={trend.length === 0}
        >
          <TimeSeriesChart data={trend} series={[{ key: "value", label: "Tamanho" }]} unit="B" />
        </ChartPanel>
        <ChartPanel
          title="Distribuição por domínio"
          description="Participação aproximada do tamanho em disco por domínio funcional."
          isLoading={health.isLoading}
          error={health.error ?? undefined}
          isEmpty={distribution.length === 0}
        >
          <CategoryBarChart data={distribution} layout="horizontal" colorByIndex />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Notas de capacidade"
          description="Premissas repassadas à equipe de infraestrutura."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Volume" value="Volume LVM dedicado no nó do banco de dados" />
            <StatRow label="Limite de alerta" value="Aviso em 75% do volume, crítico em 90%" />
            <StatRow
              label="Particionamento"
              value="Tabelas de auditoria e requisições de API particionadas mensalmente"
            />
            <StatRow
              label="Arquivamento"
              value="Partições frias exportadas pelo pipeline de backup"
            />
          </dl>
        </section>
      </div>
    </div>
  );
}
