import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { AppLink } from "@/components/common/app-link";
import { formatBytes, formatDateTime, formatDuration, formatRelative } from "@/utils/format";
import type { BackupJob } from "@/types";

export const Route = createFileRoute("/_admin/backups/")({
  head: () => ({
    meta: [
      { title: "Visão Geral de Backups — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Postura de backup da plataforma CB67 Labs: rotinas agendadas, execuções recentes, verificação de checksum e confiança na restauração.",
      },
      { property: "og:title", content: "Visão Geral de Backups — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Rotinas agendadas, execuções recentes e confiança na restauração.",
      },
    ],
  }),
  component: BackupsOverview,
});

function BackupsOverview() {
  const jobs = useQuery(q.backupJobs());
  const runs = useQuery(q.backupRuns());
  const tests = useQuery(q.restoreTests());

  const jobRows = jobs.data ?? [];
  const runRows = runs.data ?? [];
  const testRows = tests.data ?? [];

  const failedRuns = runRows.filter(
    (row) => row.status === "unavailable" || row.checksum === "failed",
  );
  const totalSize = runRows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const lastTest = testRows[0];

  const byType = (["full", "incremental", "wal"] as const).map((type) => ({
    t: type,
    value: runRows.filter((row) => row.type === type).length,
  }));

  const columns: Column<BackupJob>[] = [
    {
      id: "name",
      header: "Rotina",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.target}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "type",
      header: "Tipo",
      cell: (row) => <StatusBadge status={row.type} />,
      sortValue: (row) => row.type,
    },
    {
      id: "schedule",
      header: "Agenda",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.schedule}</code>,
    },
    {
      id: "last",
      header: "Última execução",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.lastRunAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.lastRunAt)}</p>
        </div>
      ),
      sortValue: (row) => row.lastRunAt,
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
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral de Backups"
        description="Os backups são produzidos e verificados pela plataforma no host Proxmox. Esta superfície relata o resultado; agendamento e retenção são de responsabilidade do backend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rotinas agendadas" value={jobRows.length} isLoading={jobs.isLoading} />
        <MetricCard
          label="Execuções falhas"
          value={failedRuns.length}
          tone={failedRuns.length > 0 ? "crit" : "ok"}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Volume armazenado"
          value={formatBytes(totalSize)}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Último teste de restauração"
          value={lastTest ? lastTest.result : "—"}
          tone={lastTest?.result === "passed" ? "ok" : lastTest ? "crit" : "neutral"}
          hint={lastTest ? formatRelative(lastTest.startedAt) : undefined}
          isLoading={tests.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="Execuções por tipo"
          description="Composição das execuções recentes de backup."
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          isEmpty={runRows.length === 0}
        >
          <CategoryBarChart data={byType} colorByIndex />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Objetivos de recuperação</h3>
          <dl className="mt-2">
            <StatRow label="Meta de RPO" value="15 minutos (envio de WAL)" />
            <StatRow label="Meta de RTO" value="60 minutos (restauração completa)" />
            <StatRow
              label="Último RPO medido"
              value={lastTest ? `${lastTest.rpoMinutes} min` : "—"}
            />
            <StatRow
              label="Último RTO medido"
              value={lastTest ? `${lastTest.rtoMinutes} min` : "—"}
            />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Rotinas de backup"
          description="Pipelines completos, incrementais e de WAL atualmente provisionados."
          actions={
            <AppLink to="/backups/history" className="text-xs text-primary hover:underline">
              Histórico de execuções
            </AppLink>
          }
        />
        <DataTable
          data={jobs.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={jobs.isLoading}
          error={jobs.error ?? undefined}
          pageSize={10}
          dense
        />
      </div>
    </div>
  );
}
