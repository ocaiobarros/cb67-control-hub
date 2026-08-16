import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { AppLink } from "@/components/common/app-link";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { SecurityEvent, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/security/")({
  head: () => ({
    meta: [
      { title: "Security Overview — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Authentication and authorisation posture: mTLS rejections, invalid tokens, unauthorised and forbidden responses, throttling and suspicious clients.",
      },
      { property: "og:title", content: "Security Overview — CB67 Labs Control Center" },
      { property: "og:description", content: "Rejections, denials and suspicious client activity." },
    ],
  }),
  component: SecurityOverviewPage,
});

function SecurityOverviewPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.securityOverview(range));
  const events = useQuery(q.securityEvents());
  const firewall = useQuery(q.firewall());
  const data = overview.data;

  const recent = (events.data ?? []).slice(0, 8);

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
    },
    {
      id: "client",
      header: "Client",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
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
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Security Overview"
        description="Every rejection is counted at the edge before business logic executes. Denials are expected traffic in a least-privilege platform; sustained growth is the signal worth investigating."
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
          label="Unauthorised (401)"
          value={data ? formatNumber(data.unauthorized) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Forbidden (403)"
          value={data ? formatNumber(data.forbidden) : "—"}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Rate limited"
          value={data ? formatNumber(data.rateLimited) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Revoked certificate attempts"
          value={data ? formatNumber(data.revokedCertAttempts) : "—"}
          tone={data && data.revokedCertAttempts > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Admin login failures"
          value={data ? formatNumber(data.adminLoginFailures) : "—"}
          tone={data && data.adminLoginFailures > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Suspicious clients"
          value={data ? formatNumber(data.suspiciousClients) : "—"}
          tone={data && data.suspiciousClients > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Authentication outcomes"
          description="Successful and rejected authentication attempts over time."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authChart.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={data?.authChart ?? []}
            series={[{ key: "value", label: "Rejections" }]}
            variant="line"
          />
        </ChartPanel>
        <ChartPanel
          title="Authorisation denials"
          description="Requests rejected for missing scope or role."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authorizationChart.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.authorizationChart ?? []} colorByIndex />
        </ChartPanel>
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Perimeter</h3>
        <dl className="mt-2">
          <StatRow
            label="Firewall"
            value={firewall.data ? <StatusBadge status={firewall.data.status} /> : "—"}
          />
          <StatRow label="Default policy" value={firewall.data?.policy ?? "—"} />
          <StatRow label="Active rules" value={firewall.data?.rulesCount ?? "—"} />
          <StatRow label="Recent blocks" value={firewall.data?.recentBlocks ?? "—"} />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Detailed rules are available under{" "}
          <AppLink to="/security/firewall" className="text-primary hover:underline">
            Security → Firewall
          </AppLink>
          .
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Latest security events"
          description="Most recent entries; the full stream lives under Security → Security Events."
          actions={
            <AppLink to="/security/events" className="text-xs text-primary hover:underline">
              All events
            </AppLink>
          }
        />
        <DataTable
          data={recent}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          dense
        />
      </div>
    </div>
  );
}
