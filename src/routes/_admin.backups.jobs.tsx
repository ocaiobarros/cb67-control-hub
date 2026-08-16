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
      { title: "Backup Jobs — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Inventory of scheduled backup jobs for the CB67 Labs platform with schedule, target, duration and manual run controls.",
      },
      { property: "og:title", content: "Backup Jobs — CB67 Labs Control Center" },
      { property: "og:description", content: "Scheduled backup jobs, targets and manual run controls." },
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
      header: "Job",
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
      header: "Type",
      cell: (row) => <StatusBadge status={row.type} />,
      sortValue: (row) => row.type,
    },
    {
      id: "target",
      header: "Target",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.target}</code>,
      sortValue: (row) => row.target,
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: (row) => <code className="mono-xs">{row.schedule}</code>,
    },
    {
      id: "last",
      header: "Last run",
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
      header: "Duration",
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
            Run now
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup Jobs"
        description="Job definitions live in the platform scheduler. Operators can request an out-of-band run; the backend decides whether to accept it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Jobs" value={rows.length} isLoading={jobs.isLoading} />
        <MetricCard
          label="Full"
          value={rows.filter((row) => row.type === "full").length}
          isLoading={jobs.isLoading}
        />
        <MetricCard
          label="Incremental"
          value={rows.filter((row) => row.type === "incremental").length}
          isLoading={jobs.isLoading}
        />
        <MetricCard
          label="Degraded or failing"
          value={rows.filter((row) => row.status !== "healthy").length}
          tone={rows.some((row) => row.status === "unavailable") ? "crit" : "warn"}
          isLoading={jobs.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Job inventory" description="Search by name or target volume." />
        <DataTable
          data={jobs.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={jobs.isLoading}
          error={jobs.error ?? undefined}
          searchPlaceholder="Search job or target…"
          searchValue={(row) => `${row.name} ${row.target} ${row.type}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Run backup job now"
        warning="An out-of-band run consumes disk and I/O on the target host and may overlap with the scheduled window."
        details={
          target
            ? [
                { label: "Job", value: target.name },
                { label: "Type", value: target.type },
                { label: "Target", value: target.target },
                { label: "Typical duration", value: formatDuration(target.durationSec) },
              ]
            : undefined
        }
        confirmLabel="Run job"
        environmentNotice="The request is queued with the operator identity and appears in the audit trail."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "backup.run", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
