import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { AdminSession } from "@/types";

export const Route = createFileRoute("/_admin/security/sessions")({
  head: () => ({
    meta: [
      { title: "Session Security — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Session security posture: concurrency per operator, originating sources, device fingerprints and expiry windows.",
      },
      { property: "og:title", content: "Session Security — CB67 Labs Control Center" },
      { property: "og:description", content: "Session concurrency, sources and expiry posture." },
    ],
  }),
  component: SecuritySessionsPage,
});

function SecuritySessionsPage() {
  const sessions = useQuery(q.sessions());
  const rows = sessions.data ?? [];

  const byOperator = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.administrator] = (acc[row.administrator] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value);

  const concurrent = byOperator.filter((entry) => entry.value > 1);

  const columns: Column<AdminSession>[] = [
    {
      id: "administrator",
      header: "Operator",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.administrator}</p>
          <p className="text-xs text-muted-foreground">{row.device}</p>
        </div>
      ),
      sortValue: (row) => row.administrator,
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      sortValue: (row) => row.source,
    },
    {
      id: "activity",
      header: "Last activity",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastActivityAt)}</span>
      ),
      sortValue: (row) => row.lastActivityAt,
      align: "right",
    },
    {
      id: "expires",
      header: "Expires",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
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
        title="Session Security"
        description="Sessions are bound to a device fingerprint and expire on a fixed window. Termination controls live under Identity → Sessions."
        actions={
          <AppLink to="/identity/sessions" className="text-xs text-primary hover:underline">
            Manage sessions
          </AppLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Open sessions" value={rows.length} isLoading={sessions.isLoading} />
        <MetricCard
          label="Operators online"
          value={byOperator.length}
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Concurrent operators"
          value={concurrent.length}
          tone={concurrent.length > 0 ? "warn" : "ok"}
          hint="More than one active session"
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Distinct sources"
          value={new Set(rows.map((row) => row.source)).size}
          isLoading={sessions.isLoading}
        />
      </div>

      <ChartPanel
        title="Sessions per operator"
        description="Unexpected concurrency can indicate a shared account or a stolen session."
        isLoading={sessions.isLoading}
        error={sessions.error ?? undefined}
        isEmpty={byOperator.length === 0}
      >
        <CategoryBarChart data={byOperator} layout="horizontal" />
      </ChartPanel>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Session policy</h3>
        <dl className="mt-2">
          <StatRow label="Binding" value="Device fingerprint plus source address" />
          <StatRow label="Expiry" value="Fixed window, no silent extension" />
          <StatRow label="Storage" value="Server-side session records; no long-lived browser tokens" />
          <StatRow label="Termination" value="Immediate, from Identity → Sessions" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Active sessions" description="Read-only view of the current session inventory." />
        <DataTable
          data={sessions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={sessions.isLoading}
          error={sessions.error ?? undefined}
          searchPlaceholder="Search operator, device or source…"
          searchValue={(row) => `${row.administrator} ${row.device} ${row.source}`}
          pageSize={15}
          dense
        />
      </div>
    </div>
  );
}
