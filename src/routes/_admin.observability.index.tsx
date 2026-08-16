import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { AppLink } from "@/components/common/app-link";
import { formatCompact, formatMs, formatPercent, formatRelative } from "@/utils/format";
import type { Alert, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/observability/")({
  head: () => ({
    meta: [
      { title: "Observability Overview — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Golden signals for the CB67 Labs platform: traffic, latency, errors and saturation, with the current alert inventory.",
      },
      { property: "og:title", content: "Observability Overview — CB67 Labs Control Center" },
      { property: "og:description", content: "Traffic, latency, errors, saturation and live alerts." },
    ],
  }),
  component: ObservabilityOverview,
});

function ObservabilityOverview() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.overview(range));
  const alerts = useQuery(q.alerts());
  const services = useQuery(q.services());
  const snapshot = overview.data;

  const firing = (alerts.data ?? []).filter((row) => row.state === "firing");

  const columns: Column<Alert>[] = [
    {
      id: "name",
      header: "Alert",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <span className="mono-xs text-muted-foreground">{row.source}</span>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "severity",
      header: "Severity",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
    },
    {
      id: "started",
      header: "Started",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.startedAt)}</span>,
      sortValue: (row) => row.startedAt,
      align: "right",
    },
    {
      id: "state",
      header: "State",
      cell: (row) => <StatusBadge status={row.state} />,
      sortValue: (row) => row.state,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Observability Overview"
        description="Metrics, logs and alerts are collected by the platform stack on the management network. This surface reads that stack; it never queries hosts directly."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={snapshot ? formatCompact(snapshot.requests) : "—"}
          hint={snapshot ? `${snapshot.rps.toFixed(1)} rps` : undefined}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="p95 latency"
          value={snapshot ? formatMs(snapshot.p95) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Error rate"
          value={snapshot ? formatPercent(snapshot.errorRate) : "—"}
          tone={snapshot && snapshot.errorRate > 1 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Firing alerts"
          value={firing.length}
          tone={firing.length > 0 ? "crit" : "ok"}
          isLoading={alerts.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Traffic"
          description="Requests served by the platform."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.requests.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.requests ?? []}
            series={[{ key: "value", label: "Requests" }]}
          />
        </ChartPanel>
        <ChartPanel
          title="Latency"
          description="Aggregated response time across endpoints."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.latency.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.latency ?? []}
            series={[{ key: "value", label: "Latency" }]}
            variant="line"
            unit="ms"
          />
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Saturation"
          description="Cluster resource utilisation."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.resources.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.resources ?? []}
            series={[
              { key: "cpu", label: "CPU" },
              { key: "memory", label: "Memory" },
            ]}
            variant="line"
            unit="%"
          />
        </ChartPanel>
        <ChartPanel
          title="Errors"
          description="Failure volume in the selected window."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.errors.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.errors ?? []}
            series={[{ key: "value", label: "Errors" }]}
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Alert inventory"
          description="Firing and acknowledged alerts across the platform."
          actions={
            <AppLink to="/observability/alerts" className="text-xs text-primary hover:underline">
              All alerts
            </AppLink>
          }
        />
        <DataTable
          data={alerts.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={alerts.isLoading}
          error={alerts.error ?? undefined}
          pageSize={10}
          dense
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {(services.data ?? []).length} platform services are reporting health to the collector.
      </p>
    </div>
  );
}
