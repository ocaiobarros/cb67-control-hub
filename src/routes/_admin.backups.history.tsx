import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { cn } from "@/lib/utils";
import { formatBytes, formatDateTime, formatDuration, formatRelative } from "@/utils/format";
import type { BackupRun } from "@/types";

export const Route = createFileRoute("/_admin/backups/history")({
  head: () => ({
    meta: [
      { title: "Histórico de Backups — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Histórico cronológico das execuções de backup da plataforma CB67 Labs com tamanho, duração, resultado de checksum e desfecho.",
      },
      { property: "og:title", content: "Histórico de Backups — CB67 Labs Control Center" },
      { property: "og:description", content: "Histórico de execuções com tamanho, duração e desfecho." },
    ],
  }),
  component: BackupHistoryPage,
});

const TYPES: (BackupRun["type"] | "all")[] = ["all", "full", "incremental", "wal"];

function BackupHistoryPage() {
  const runs = useQuery(q.backupRuns());
  const [type, setType] = useState<BackupRun["type"] | "all">("all");

  const all = runs.data ?? [];
  const rows = type === "all" ? all : all.filter((row) => row.type === type);
  const failed = all.filter((row) => row.status === "unavailable");

  const sizeByType = (["full", "incremental", "wal"] as const).map((value) => ({
    t: value,
    value: all.filter((row) => row.type === value).reduce((sum, row) => sum + row.sizeBytes, 0),
  }));

  const columns: Column<BackupRun>[] = [
    {
      id: "timestamp",
      header: "Quando",
      cell: (row) => (
        <div>
          <span className="mono-xs">{formatDateTime(row.timestamp)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.timestamp)}</p>
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
      id: "duration",
      header: "Duração",
      cell: (row) => <span className="tabular">{formatDuration(row.durationSec)}</span>,
      sortValue: (row) => row.durationSec,
      align: "right",
    },
    {
      id: "checksum",
      header: "Checksum",
      cell: (row) => <StatusBadge status={row.checksum} />,
      sortValue: (row) => row.checksum,
      align: "right",
    },
    {
      id: "status",
      header: "Resultado",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Histórico de Backups"
        description="Todas as execuções relatadas pelo pipeline de backup, mais recentes primeiro. Os artefatos em si nunca são expostos por esta interface."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Execuções registradas" value={all.length} isLoading={runs.isLoading} />
        <MetricCard
          label="Execuções falhas"
          value={failed.length}
          tone={failed.length > 0 ? "crit" : "ok"}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Volume total"
          value={formatBytes(all.reduce((sum, row) => sum + row.sizeBytes, 0))}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Duração média"
          value={
            all.length > 0
              ? formatDuration(Math.round(all.reduce((sum, row) => sum + row.durationSec, 0) / all.length))
              : "—"
          }
          isLoading={runs.isLoading}
        />
      </div>

      <ChartPanel
        title="Volume armazenado por tipo"
        description="Tamanho acumulado de artefatos por pipeline."
        isLoading={runs.isLoading}
        error={runs.error ?? undefined}
        isEmpty={all.length === 0}
      >
        <CategoryBarChart data={sizeByType} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Histórico de execuções" description="Filtrar por tipo de pipeline." />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          pageSize={20}
          dense
          toolbar={
            <div role="group" aria-label="Tipo de backup" className="inline-flex overflow-hidden rounded-md border border-border">
              {TYPES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={type === value}
                  onClick={() => setType(value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium transition-colors",
                    type === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}
