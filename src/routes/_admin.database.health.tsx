import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { StatusBadge } from "@/components/common/status-badge";
import { formatBytes, formatNumber, formatPercent } from "@/utils/format";
import { platformMeta } from "@/config/env";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/database/health")({
  head: () => ({
    meta: [
      { title: "Saúde do Banco de Dados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Saúde do PostgreSQL da plataforma CB67 Labs: pool de conexões, throughput, taxa de acerto de cache, locks e deadlocks.",
      },
      { property: "og:title", content: "Saúde do Banco de Dados — CB67 Labs Control Center" },
      { property: "og:description", content: "Pool de conexões, throughput e saúde de locks do PostgreSQL." },
    ],
  }),
  component: DatabaseHealthPage,
});

function DatabaseHealthPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const health = useQuery(q.databaseHealth());
  const series = useQuery(q.databaseSeries(range));
  const db = health.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Saúde do Banco de Dados"
        description="Um único cluster PostgreSQL sustenta a plataforma: licenciamento, identidade, auditoria e metadados de API. As métricas vêm do exporter do banco de dados, nunca de consultas diretas emitidas por esta interface."
        meta={db ? <StatusBadge status={db.status} /> : undefined}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Transações/s"
          value={db ? formatNumber(db.transactionsPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Consultas/s"
          value={db ? formatNumber(db.queriesPerSec) : "—"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Taxa de acerto de cache"
          value={db ? formatPercent(db.cacheHitRatio, 1) : "—"}
          tone={db && db.cacheHitRatio < 95 ? "warn" : "ok"}
          isLoading={health.isLoading}
        />
        <MetricCard
          label="Deadlocks"
          value={db ? db.deadlocks : "—"}
          tone={db && db.deadlocks > 0 ? "crit" : "ok"}
          isLoading={health.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <UsageCard
          label="Pool de conexões"
          used={db?.connections ?? 0}
          total={db?.maxConnections ?? 0}
          formatValue={(value) => formatNumber(value)}
          hint="Saturação do pool acima de 80% indica um cliente com vazamento ou um pooler subdimensionado."
        />
        <UsageCard
          label="Tamanho do cluster"
          used={db?.sizeBytes ?? 0}
          total={Math.max(db?.sizeBytes ?? 0, 512 * 1024 ** 3)}
          formatValue={(value) => formatBytes(value)}
          hint="Volume provisionado para o mount do banco de dados no host Proxmox."
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Conexões"
          description="Backends ativos na janela selecionada."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={series.data ?? []}
            series={[{ key: "connections", label: "Conexões" }]}
          />
        </ChartPanel>
        <ChartPanel
          title="Throughput de consultas e locks"
          description="Consultas por segundo em relação à contenção de locks."
          isLoading={series.isLoading}
          error={series.error ?? undefined}
          isEmpty={(series.data?.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={series.data ?? []}
            series={[
              { key: "queries", label: "Consultas/s" },
              { key: "locks", label: "Locks" },
            ]}
            variant="line"
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Dados do cluster" description="Características de implantação relevantes para operadores." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Motor" value="PostgreSQL (on-premises)" />
            <StatRow label="Plataforma do host" value="Debian 13 no Proxmox" />
            <StatRow label="Exposição" value="Apenas rede de gerenciamento" />
            <StatRow label="Locks mantidos" value={db ? formatNumber(db.locks) : "—"} />
            <StatRow label="Plataforma" value={<code className="mono-xs">{platformMeta.publicDomain}</code>} />
          </dl>
        </section>
      </div>
    </div>
  );
}
