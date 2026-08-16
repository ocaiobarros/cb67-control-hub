import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { SecurityEvent, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/security/authentication")({
  head: () => ({
    meta: [
      { title: "Authentication — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Authentication telemetry for machine clients and operators: mTLS handshakes, token validation and revoked certificate attempts.",
      },
      { property: "og:title", content: "Authentication — CB67 Labs Control Center" },
      { property: "og:description", content: "mTLS and token authentication outcomes." },
    ],
  }),
  component: AuthenticationPage,
});

const AUTH_CATEGORIES = ["mtls", "token", "certificate", "authentication", "login"];

function AuthenticationPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.securityOverview(range));
  const events = useQuery(q.securityEvents());
  const data = overview.data;

  const authEvents = (events.data ?? []).filter((event) =>
    AUTH_CATEGORIES.some((category) => event.category.toLowerCase().includes(category)),
  );

  const columns: Column<SecurityEvent>[] = [
    {
      id: "timestamp",
      header: "When",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "event",
      header: "Event",
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
      id: "source",
      header: "Source",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
      align: "right",
    },
    {
      id: "decision",
      header: "Decision",
      cell: (row) => <StatusBadge status={row.decision} />,
      sortValue: (row) => row.decision,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Authentication"
        description="The platform authenticates machine clients with mutual TLS plus client credentials. A rejected handshake never reaches the API layer, so these counters come from the edge."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="mTLS rejected"
          value={data ? formatNumber(data.mtlsRejected) : "—"}
          tone={data && data.mtlsRejected > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Invalid tokens"
          value={data ? formatNumber(data.invalidTokens) : "—"}
          tone={data && data.invalidTokens > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Revoked certificate attempts"
          value={data ? formatNumber(data.revokedCertAttempts) : "—"}
          tone={data && data.revokedCertAttempts > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Operator login failures"
          value={data ? formatNumber(data.adminLoginFailures) : "—"}
          isLoading={overview.isLoading}
        />
      </div>

      <ChartPanel
        title="Authentication rejections"
        description="Rejections recorded at the TLS and token validation boundary."
        isLoading={overview.isLoading}
        error={overview.error ?? undefined}
        isEmpty={(data?.authChart.length ?? 0) === 0}
        height={260}
      >
        <TimeSeriesChart
          data={data?.authChart ?? []}
          series={[{ key: "value", label: "Rejections" }]}
        />
      </ChartPanel>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Authentication model</h3>
        <dl className="mt-2">
          <StatRow label="Machine clients" value="Mutual TLS plus client credentials" />
          <StatRow label="Operators" value="Federated identity with short-lived sessions" />
          <StatRow label="Token lifetime" value="Backend controlled (provisional)" />
          <StatRow label="Credential storage" value="Server-side only; never returned to this interface" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Authentication events"
          description="Filtered from the security event stream by category."
        />
        <DataTable
          data={authEvents}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="No authentication events in the current dataset."
          searchPlaceholder="Search client, source or event…"
          searchValue={(row) => `${row.clientId} ${row.source} ${row.event}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
