import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatDateTime, formatDuration, formatRelative } from "@/utils/format";
import type { BackupJob } from "@/types";

export const Route = createFileRoute("/_admin/backups/jobs")({
  head: () => ({
    meta: [
      { title: "Rotinas de Backup — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Inventário de rotinas de backup agendadas da plataforma CB67 Labs, com agenda, alvo, duração e controles de execução manual.",
      },
      { property: "og:title", content: "Rotinas de Backup — CB67 Labs Control Center" },
      { property: "og:description", content: "Rotinas de backup agendadas, alvos e controles de execução manual." },
    ],
  }),
  component: BackupJobsPage,
});

function BackupJobsPage() {
  const jobs = useQuery(q.backupJobs());
  const action = useAdminAction();
  const [target, setTarget] = useState<BackupJob | null>(null);
  const rows = jobs.data ?? [];

  const columns: Column<BackupJob>[] = [
    {
      id: "name",
      header: "Rotina",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.id}</code>
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
      id: "target",
      header: "Alvo",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.target}</code>,
      sortValue: (row) => row.target,
    },
    {
      id: "schedule",
      header: "Agenda",
      cell: (row) => <code className="mono-xs">{row.schedule}</code>,
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
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="backups:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Executar agora
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rotinas de Backup"
        description="As definições de rotina vivem no agendador da plataforma. Operadores podem solicitar uma execução fora da programação; o backend decide se aceita."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rotinas" value={rows.length} isLoading={jobs.isLoading} />
        <MetricCard
          label="Completo"
          value={rows.filter((row) => row.type === "full").length}
          isLoading={jobs.isLoading}
        />
        <MetricCard
          label="Incremental"
          value={rows.filter((row) => row.type === "incremental").length}
          isLoading={jobs.isLoading}
        />
        <MetricCard
          label="Degradado ou falhando"
          value={rows.filter((row) => row.status !== "healthy").length}
          tone={rows.some((row) => row.status === "unavailable") ? "crit" : "warn"}
          isLoading={jobs.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Inventário de rotinas" description="Busque por nome ou volume de destino." />
        <DataTable
          data={jobs.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={jobs.isLoading}
          error={jobs.error ?? undefined}
          searchPlaceholder="Buscar rotina ou alvo…"
          searchValue={(row) => `${row.name} ${row.target} ${row.type}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Executar rotina de backup agora"
        warning="Uma execução fora da programação consome disco e I/O no host de destino e pode sobrepor a janela agendada."
        details={
          target
            ? [
                { label: "Rotina", value: target.name },
                { label: "Tipo", value: target.type },
                { label: "Alvo", value: target.target },
                { label: "Duração típica", value: formatDuration(target.durationSec) },
              ]
            : undefined
        }
        confirmLabel="Executar rotina"
        environmentNotice="A solicitação é enfileirada com a identidade do operador e aparece na trilha de auditoria."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "backup.run", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
