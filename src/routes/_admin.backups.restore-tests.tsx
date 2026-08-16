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
      { title: "Restore Tests — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Restore verification history for the CB67 Labs platform with measured RPO and RTO per exercise and pass or fail outcome.",
      },
      { property: "og:title", content: "Restore Tests — CB67 Labs Control Center" },
      { property: "og:description", content: "Restore exercises with measured RPO and RTO." },
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
      header: "Exercise",
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
      header: "Started",
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
      header: "Duration",
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
      header: "Result",
      cell: (row) => <StatusBadge status={row.result} />,
      sortValue: (row) => row.result,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Restore Tests"
        description="A backup is only credible once it has been restored. Exercises run on an isolated target and never touch production data."
        meta={latest ? <StatusBadge status={latest.result} /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Exercises" value={rows.length} isLoading={tests.isLoading} />
        <MetricCard
          label="Passed"
          value={passed.length}
          tone={passed.length === rows.length ? "ok" : "warn"}
          isLoading={tests.isLoading}
        />
        <MetricCard
          label="Best RTO"
          value={rows.length > 0 ? `${Math.min(...rows.map((row) => row.rtoMinutes))} min` : "—"}
          isLoading={tests.isLoading}
        />
        <MetricCard
          label="Worst RTO"
          value={rows.length > 0 ? `${Math.max(...rows.map((row) => row.rtoMinutes))} min` : "—"}
          tone={rows.some((row) => row.rtoMinutes > RTO_TARGET) ? "warn" : "ok"}
          isLoading={tests.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="Measured RTO per exercise"
          description={`Target is ${RTO_TARGET} minutes for a full restore.`}
          isLoading={tests.isLoading}
          error={tests.error ?? undefined}
          isEmpty={rtoSeries.length === 0}
        >
          <CategoryBarChart data={rtoSeries} layout="horizontal" colorByIndex />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Objectives</h3>
          <dl className="mt-2">
            <StatRow label="RPO target" value={`${RPO_TARGET} minutes`} />
            <StatRow label="RTO target" value={`${RTO_TARGET} minutes`} />
            <StatRow label="Cadence" value="Monthly, plus after any schema migration" />
            <StatRow label="Target environment" value="Isolated restore host on Proxmox" />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Exercise history" description="Search by exercise name or source artefact." />
        <DataTable
          data={tests.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={tests.isLoading}
          error={tests.error ?? undefined}
          searchPlaceholder="Search exercise or artefact…"
          searchValue={(row) => `${row.name} ${row.backup}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
