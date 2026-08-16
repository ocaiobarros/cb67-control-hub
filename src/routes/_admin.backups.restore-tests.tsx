import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatDateTime, formatDuration, formatRelative } from "@/utils/format";
import type { RestoreTest } from "@/types";

export const Route = createFileRoute("/_admin/backups/restore-tests")({
  head: () => ({
    meta: [
      { title: "Testes de Restauração — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Histórico de verificação de restauração da plataforma CB67 Labs com RPO e RTO medidos por exercício e desfecho de aprovação ou falha.",
      },
      { property: "og:title", content: "Testes de Restauração — CB67 Labs Control Center" },
      { property: "og:description", content: "Exercícios de restauração com RPO e RTO medidos." },
    ],
  }),
  component: RestoreTestsPage,
});

const RPO_TARGET = 15;
const RTO_TARGET = 60;

function RestoreTestsPage() {
  const tests = useQuery(q.restoreTests());
  const rows = tests.data ?? [];
  const passed = rows.filter((row) => row.result === "passed");
  const latest = rows[0];

  const rtoSeries = rows.map((row) => ({ t: row.name, value: row.rtoMinutes }));

  const columns: Column<RestoreTest>[] = [
    {
      id: "name",
      header: "Exercício",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.backup}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "started",
      header: "Iniciado",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.startedAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.startedAt)}</p>
        </div>
      ),
      sortValue: (row) => row.startedAt,
      align: "right",
    },
    {
      id: "duration",
      header: "Duração",
      cell: (row) => <span className="tabular">{formatDuration(row.durationSec)}</span>,
      sortValue: (row) => row.durationSec,
      align: "right",
    },
    {
      id: "rpo",
      header: "RPO",
      cell: (row) => (
        <span className={row.rpoMinutes > RPO_TARGET ? "tabular text-warn" : "tabular"}>
          {row.rpoMinutes} min
        </span>
      ),
      sortValue: (row) => row.rpoMinutes,
      align: "right",
    },
    {
      id: "rto",
      header: "RTO",
      cell: (row) => (
        <span className={row.rtoMinutes > RTO_TARGET ? "tabular text-warn" : "tabular"}>
          {row.rtoMinutes} min
        </span>
      ),
      sortValue: (row) => row.rtoMinutes,
      align: "right",
    },
    {
      id: "result",
      header: "Resultado",
      cell: (row) => <StatusBadge status={row.result} />,
      sortValue: (row) => row.result,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Testes de Restauração"
        description="Um backup só é confiável depois de ser restaurado. Os exercícios são executados em um alvo isolado e nunca tocam em dados de produção."
        meta={latest ? <StatusBadge status={latest.result} /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Exercícios" value={rows.length} isLoading={tests.isLoading} />
        <MetricCard
          label="Aprovados"
          value={passed.length}
          tone={passed.length === rows.length ? "ok" : "warn"}
          isLoading={tests.isLoading}
        />
        <MetricCard
          label="Melhor RTO"
          value={rows.length > 0 ? `${Math.min(...rows.map((row) => row.rtoMinutes))} min` : "—"}
          isLoading={tests.isLoading}
        />
        <MetricCard
          label="Pior RTO"
          value={rows.length > 0 ? `${Math.max(...rows.map((row) => row.rtoMinutes))} min` : "—"}
          tone={rows.some((row) => row.rtoMinutes > RTO_TARGET) ? "warn" : "ok"}
          isLoading={tests.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="RTO medido por exercício"
          description={`A meta é ${RTO_TARGET} minutos para uma restauração completa.`}
          isLoading={tests.isLoading}
          error={tests.error ?? undefined}
          isEmpty={rtoSeries.length === 0}
        >
          <CategoryBarChart data={rtoSeries} layout="horizontal" colorByIndex />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Objetivos</h3>
          <dl className="mt-2">
            <StatRow label="Meta de RPO" value={`${RPO_TARGET} minutos`} />
            <StatRow label="Meta de RTO" value={`${RTO_TARGET} minutos`} />
            <StatRow label="Frequência" value="Mensal, além de após qualquer migração de esquema" />
            <StatRow label="Ambiente alvo" value="Host de restauração isolado no Proxmox" />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Histórico de exercícios" description="Pesquisar por nome do exercício ou artefato de origem." />
        <DataTable
          data={tests.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={tests.isLoading}
          error={tests.error ?? undefined}
          searchPlaceholder="Pesquisar exercício ou artefato…"
          searchValue={(row) => `${row.name} ${row.backup}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
