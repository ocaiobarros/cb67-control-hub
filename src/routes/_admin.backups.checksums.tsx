import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, DonutChart } from "@/components/charts/chart-panel";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatBytes, formatDateTime, formatPercent } from "@/utils/format";
import type { BackupRun } from "@/types";

export const Route = createFileRoute("/_admin/backups/checksums")({
  head: () => ({
    meta: [
      { title: "Checksums de Backup — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Estado da verificação de integridade dos artefatos de backup da CB67 Labs, com resultados de checksum verificados, pendentes e falhos.",
      },
      { property: "og:title", content: "Checksums de Backup — CB67 Labs Control Center" },
      { property: "og:description", content: "Estado da verificação de integridade de artefatos e controles de reverificação." },
    ],
  }),
  component: ChecksumsPage,
});

function ChecksumsPage() {
  const runs = useQuery(q.backupRuns());
  const action = useAdminAction();
  const [target, setTarget] = useState<BackupRun | null>(null);

  const all = runs.data ?? [];
  const verified = all.filter((row) => row.checksum === "verified");
  const failedRows = all.filter((row) => row.checksum === "failed");
  const pending = all.filter((row) => row.checksum === "pending");
  const coverage = all.length > 0 ? (verified.length / all.length) * 100 : 0;

  const distribution = [
    { t: "verified", value: verified.length },
    { t: "pending", value: pending.length },
    { t: "failed", value: failedRows.length },
  ];

  const columns: Column<BackupRun>[] = [
    {
      id: "timestamp",
      header: "Artefato",
      cell: (row) => (
        <div className="min-w-0">
          <span className="mono-xs">{formatDateTime(row.timestamp)}</span>
          <p className="mono-xs text-muted-foreground">{row.id}</p>
        </div>
      ),
      sortValue: (row) => row.timestamp,
    },
    {
      id: "type",
      header: "Tipo",
      cell: (row) => <StatusBadge status={row.type} />,
      sortValue: (row) => row.type,
    },
    {
      id: "size",
      header: "Tamanho",
      cell: (row) => <span className="tabular">{formatBytes(row.sizeBytes)}</span>,
      sortValue: (row) => row.sizeBytes,
      align: "right",
    },
    {
      id: "checksum",
      header: "Integridade",
      cell: (row) => <StatusBadge status={row.checksum} />,
      sortValue: (row) => row.checksum,
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
            Reverificar
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Checksums de Backup"
        description="A integridade é calculada pelo pipeline de backup quando um artefato é gravado e reverificada periodicamente. Um checksum falho invalida o artefato para restauração."
        meta={<StatusBadge status={failedRows.length > 0 ? "failed" : "verified"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Artefatos" value={all.length} isLoading={runs.isLoading} />
        <MetricCard label="Verificados" value={verified.length} tone="ok" isLoading={runs.isLoading} />
        <MetricCard
          label="Pendentes"
          value={pending.length}
          tone={pending.length > 0 ? "warn" : "ok"}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Falhos"
          value={failedRows.length}
          tone={failedRows.length > 0 ? "crit" : "ok"}
          isLoading={runs.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ChartPanel
          title="Estado de verificação"
          description="Distribuição dos resultados de checksum entre os artefatos armazenados."
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          isEmpty={all.length === 0}
        >
          <DonutChart data={distribution} />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Política de integridade</h3>
          <dl className="mt-2">
            <StatRow label="Algoritmo" value="SHA-256 por artefato" />
            <StatRow label="Reverificação" value="Varredura semanal sobre artefatos retidos" />
            <StatRow label="Cobertura verificada" value={formatPercent(coverage, 1)} />
            <StatRow label="Em caso de falha" value="Artefato colocado em quarentena e um alerta é gerado" />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Integridade dos artefatos" description="Buscar por identificador do artefato." />
        <DataTable
          data={runs.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          searchPlaceholder="Buscar artefato…"
          searchValue={(row) => `${row.id} ${row.type} ${row.checksum}`}
          pageSize={15}
          dense
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Reverificar checksum do artefato"
        warning="A reverificação lê o artefato completo do volume de backup e concorre por I/O com rotinas em execução."
        details={
          target
            ? [
                { label: "Artefato", value: target.id },
                { label: "Tipo", value: target.type },
                { label: "Tamanho", value: formatBytes(target.sizeBytes) },
                { label: "Estado atual", value: target.checksum },
              ]
            : undefined
        }
        confirmLabel="Reverificar"
        destructive={false}
        environmentNotice="O resultado da verificação substitui o estado de checksum armazenado para este artefato."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "backup.verify", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
