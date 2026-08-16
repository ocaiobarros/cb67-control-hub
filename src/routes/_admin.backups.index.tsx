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
      { title: "Backups Overview — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Backup posture for the CB67 Labs platform: scheduled jobs, recent runs, checksum verification and restore confidence.",
      },
      { property: "og:title", content: "Backups Overview — CB67 Labs Control Center" },
      { property: "og:description", content: "Scheduled jobs, recent runs and restore confidence." },
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

  const failedRuns = runRows.filter((row) => row.status === "unavailable" || row.checksum === "failed");
  const totalSize = runRows.reduce((sum, row) => sum + row.sizeBytes, 0);
  const lastTest = testRows[0];

  const byType = (["full", "incremental", "wal"] as const).map((type) => ({
    t: type,
    value: runRows.filter((row) => row.type === type).length,
  }));

  const columns: Column<BackupJob>[] = [
    {
      id: "name",
      header: "Job",
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
      header: "Type",
      cell: (row) => <StatusBadge status={row.type} />,
      sortValue: (row) => row.type,
    },
    {
      id: "schedule",
      header: "Schedule",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.schedule}</code>,
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backups Overview"
        description="Backups are produced and verified by the platform on the Proxmox host. This surface reports the outcome; scheduling and retention are owned by the backend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Scheduled jobs" value={jobRows.length} isLoading={jobs.isLoading} />
        <MetricCard
          label="Failed runs"
          value={failedRuns.length}
          tone={failedRuns.length > 0 ? "crit" : "ok"}
          isLoading={runs.isLoading}
        />
        <MetricCard label="Stored volume" value={formatBytes(totalSize)} isLoading={runs.isLoading} />
        <MetricCard
          label="Last restore test"
          value={lastTest ? lastTest.result : "—"}
          tone={lastTest?.result === "passed" ? "ok" : lastTest ? "crit" : "neutral"}
          hint={lastTest ? formatRelative(lastTest.startedAt) : undefined}
          isLoading={tests.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="Runs by type"
          description="Composition of recent backup runs."
          isLoading={runs.isLoading}
          error={runs.error ?? undefined}
          isEmpty={runRows.length === 0}
        >
          <CategoryBarChart data={byType} colorByIndex />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Recovery objectives</h3>
          <dl className="mt-2">
            <StatRow label="RPO target" value="15 minutes (WAL shipping)" />
            <StatRow label="RTO target" value="60 minutes (full restore)" />
            <StatRow
              label="Last measured RPO"
              value={lastTest ? `${lastTest.rpoMinutes} min` : "—"}
            />
            <StatRow
              label="Last measured RTO"
              value={lastTest ? `${lastTest.rtoMinutes} min` : "—"}
            />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Backup jobs"
          description="Full, incremental and WAL pipelines currently provisioned."
          actions={
            <AppLink to="/backups/history" className="text-xs text-primary hover:underline">
              Run history
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
