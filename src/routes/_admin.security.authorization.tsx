import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { SecurityEvent, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/security/authorization")({
  head: () => ({
    meta: [
      { title: "Authorization — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Authorisation denials by scope and role: forbidden responses, missing scopes and the clients most often denied.",
      },
      { property: "og:title", content: "Authorization — CB67 Labs Control Center" },
      { property: "og:description", content: "Scope and role denials across the API surface." },
    ],
  }),
  component: AuthorizationPage,
});

function AuthorizationPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.securityOverview(range));
  const events = useQuery(q.securityEvents());
  const data = overview.data;

  const denied = (events.data ?? []).filter((event) => event.decision === "denied");

  const byClient = Object.entries(
    denied.reduce<Record<string, number>>((acc, event) => {
      acc[event.clientId] = (acc[event.clientId] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const columns: Column<SecurityEvent>[] = [
    {
      id: "timestamp",
      header: "When",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "event",
      header: "Denied operation",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.event}</p>
          <span className="mono-xs text-muted-foreground">{row.category}</span>
        </div>
      ),
      sortValue: (row) => row.event,
    },
    {
      id: "client",
      header: "Client",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
      sortValue: (row) => row.clientId,
    },
    {
      id: "requestId",
      header: "Request",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.requestId}</code>,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authorization"
        description="Authorisation is evaluated per request against the scopes granted to the calling client. Denials are enforced server-side; the interface only reports them."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Forbidden (403)"
          value={data ? formatNumber(data.forbidden) : "—"}
          tone={data && data.forbidden > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Unauthorised (401)"
          value={data ? formatNumber(data.unauthorized) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Denied events"
          value={denied.length}
          isLoading={events.isLoading}
          hint="From the security event stream"
        />
        <MetricCard
          label="Clients denied"
          value={new Set(denied.map((event) => event.clientId)).size}
          isLoading={events.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Denials by category"
          description="Which authorisation checks reject most often."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authorizationChart.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.authorizationChart ?? []} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Most denied clients"
          description="Repeated denials usually mean a scope was never granted."
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          isEmpty={byClient.length === 0}
        >
          <CategoryBarChart data={byClient} layout="horizontal" />
        </ChartPanel>
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Authorisation model</h3>
        <dl className="mt-2">
          <StatRow label="Machine clients" value="Scope-based, least privilege per endpoint" />
          <StatRow label="Operators" value="Role-based, permissions evaluated per operation" />
          <StatRow label="Enforcement point" value="API gateway and service layer, never the browser" />
          <StatRow label="Interface behaviour" value="Actions are hidden, not merely disabled" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Denied requests" description="Correlate with the request explorer using the request identifier." />
        <DataTable
          data={denied}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="No authorisation denials in the current dataset."
          searchPlaceholder="Search client, event or request…"
          searchValue={(row) => `${row.clientId} ${row.event} ${row.requestId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
