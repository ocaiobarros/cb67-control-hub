import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatCompact, formatDateTime, formatNumber, formatRelative } from "@/utils/format";
import type { ApiErrorGroup } from "@/types";

export const Route = createFileRoute("/_admin/apis/errors")({
  head: () => ({
    meta: [
      { title: "API Errors — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Grouped API failures by status class, rate per minute, affected clients and endpoints, with first and last occurrence.",
      },
      { property: "og:title", content: "API Errors — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Error groups by 4xx, 5xx, timeout and provider failure classes.",
      },
    ],
  }),
  component: ApiErrorsPage,
});

const CLASS_LABEL: Record<ApiErrorGroup["statusClass"], string> = {
  "4xx": "Client (4xx)",
  "5xx": "Server (5xx)",
  timeout: "Timeout",
  provider: "Provider",
};

function ApiErrorsPage() {
  const errors = useQuery(q.apiErrors());
  const rows = errors.data ?? [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.count += row.count;
      acc.clients = Math.max(acc.clients, row.affectedClients);
      if (row.statusClass === "5xx" || row.statusClass === "timeout") acc.serverSide += row.count;
      return acc;
    },
    { count: 0, clients: 0, serverSide: 0 },
  );

  const byClass = (Object.keys(CLASS_LABEL) as ApiErrorGroup["statusClass"][]).map((key) => ({
    t: CLASS_LABEL[key],
    value: rows.filter((row) => row.statusClass === key).reduce((sum, row) => sum + row.count, 0),
  }));

  const byEndpoint = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      for (const endpoint of row.affectedEndpoints) {
        acc[endpoint] = (acc[endpoint] ?? 0) + row.count;
      }
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const columns: Column<ApiErrorGroup>[] = [
    {
      id: "status",
      header: "Error",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.status}</code>
          <p className="text-xs text-muted-foreground">{CLASS_LABEL[row.statusClass]}</p>
        </div>
      ),
      sortValue: (row) => row.status,
    },
    {
      id: "count",
      header: "Occurrences",
      cell: (row) => <span className="tabular">{formatNumber(row.count)}</span>,
      sortValue: (row) => row.count,
      align: "right",
    },
    {
      id: "rate",
      header: "Per minute",
      cell: (row) => <span className="tabular">{row.ratePerMin.toFixed(2)}</span>,
      sortValue: (row) => row.ratePerMin,
      align: "right",
    },
    {
      id: "trend",
      header: "Trend",
      cell: (row) => (
        <span className={row.trend > 0 ? "tabular text-crit" : "tabular text-ok"}>
          {row.trend > 0 ? "+" : ""}
          {row.trend.toFixed(1)}%
        </span>
      ),
      sortValue: (row) => row.trend,
      align: "right",
    },
    {
      id: "clients",
      header: "Clients",
      cell: (row) => <span className="tabular">{row.affectedClients}</span>,
      sortValue: (row) => row.affectedClients,
      align: "right",
    },
    {
      id: "endpoints",
      header: "Endpoints",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.affectedEndpoints.map((endpoint) => (
            <code key={endpoint} className="mono-xs rounded border border-border px-1 py-0.5">
              {endpoint}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "firstSeen",
      header: "First seen",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.firstSeen)}</span>,
      sortValue: (row) => row.firstSeen,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Last seen",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen,
      align: "right",
    },
  ];

  const worst = [...rows].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Errors"
        description="Failures are grouped by normalised status so recurring conditions surface as one signal. Provider-class errors originate upstream and are not counted against platform availability."
        meta={<StatusBadge status={totals.serverSide > 0 ? "degraded" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Error groups"
          value={rows.length}
          isLoading={errors.isLoading}
          hint="Distinct normalised conditions"
        />
        <MetricCard
          label="Occurrences"
          value={formatCompact(totals.count)}
          isLoading={errors.isLoading}
        />
        <MetricCard
          label="Server-side"
          value={formatCompact(totals.serverSide)}
          tone={totals.serverSide > 0 ? "warn" : "ok"}
          hint="5xx and timeout classes"
          isLoading={errors.isLoading}
        />
        <MetricCard
          label="Top condition"
          value={worst?.status ?? "—"}
          hint={worst ? `${formatNumber(worst.count)} occurrences` : undefined}
          isLoading={errors.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Distribution by class"
          description="Where failures originate: consumer request, platform, or upstream provider."
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          isEmpty={byClass.every((entry) => entry.value === 0)}
        >
          <CategoryBarChart data={byClass} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Most affected endpoints"
          description="Occurrences attributed to each endpoint in the current window."
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          isEmpty={byEndpoint.length === 0}
        >
          <CategoryBarChart data={byEndpoint} layout="horizontal" />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Error groups"
          description="Sorted by occurrences. Expand the request explorer to inspect individual correlated requests."
        />
        <DataTable
          data={errors.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          searchPlaceholder="Search status or endpoint…"
          searchValue={(row) => `${row.status} ${row.affectedEndpoints.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
