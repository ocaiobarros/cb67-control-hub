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
      { title: "Backup Checksums — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Integrity verification state for CB67 Labs backup artefacts, with verified, pending and failed checksum results.",
      },
      { property: "og:title", content: "Backup Checksums — CB67 Labs Control Center" },
      { property: "og:description", content: "Artefact integrity verification state and re-verify controls." },
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
      header: "Artefact",
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
      header: "Type",
      cell: (row) => <StatusBadge status={row.type} />,
      sortValue: (row) => row.type,
    },
    {
      id: "size",
      header: "Size",
      cell: (row) => <span className="tabular">{formatBytes(row.sizeBytes)}</span>,
      sortValue: (row) => row.sizeBytes,
      align: "right",
    },
    {
      id: "checksum",
      header: "Integrity",
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
            Re-verify
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup Checksums"
        description="Integrity is computed by the backup pipeline when an artefact is written and re-checked on a schedule. A failed checksum invalidates the artefact for restore."
        meta={<StatusBadge status={failedRows.length > 0 ? "failed" : "verified"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Artefacts" value={all.length} isLoading={runs.isLoading} />
        <MetricCard label="Verified" value={verified.length} tone="ok" isLoading={runs.isLoading} />
        <MetricCard
          label="Pending"
          value={pending.length}
          tone={pending.length > 0 ? "warn" : "ok"}
          isLoading={runs.isLoading}
        />
        <MetricCard
          label="Failed"
          value={failedRows.length}
          tone={failedRows.length > 0 ? "crit" : "ok"}
          isLoading={runs.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_1fr]">
        <ChartPanel
          title="Verification state"
          description="Distribution of checksum outcomes across stored artefacts."
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          isEmpty={all.length === 0}
        >
          <DonutChart data={distribution} />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Integrity policy</h3>
          <dl className="mt-2">
            <StatRow label="Algorithm" value="SHA-256 per artefact" />
            <StatRow label="Re-verification" value="Weekly sweep over retained artefacts" />
            <StatRow label="Verified coverage" value={formatPercent(coverage, 1)} />
            <StatRow label="On failure" value="Artefact quarantined and an alert is raised" />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Artefact integrity" description="Search by artefact identifier." />
        <DataTable
          data={runs.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          searchPlaceholder="Search artefact…"
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
        title="Re-verify artefact checksum"
        warning="Re-verification reads the full artefact from the backup volume and competes with running jobs for I/O."
        details={
          target
            ? [
                { label: "Artefact", value: target.id },
                { label: "Type", value: target.type },
                { label: "Size", value: formatBytes(target.sizeBytes) },
                { label: "Current state", value: target.checksum },
              ]
            : undefined
        }
        confirmLabel="Re-verify"
        destructive={false}
        environmentNotice="The verification result replaces the stored checksum state for this artefact."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "backup.verify", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
