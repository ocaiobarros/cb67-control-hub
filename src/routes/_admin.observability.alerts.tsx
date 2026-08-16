import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Alert } from "@/types";

export const Route = createFileRoute("/_admin/observability/alerts")({
  head: () => ({
    meta: [
      { title: "Alerts — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Alert inventory with severity, source rule, firing duration and acknowledgement controls for platform operators.",
      },
      { property: "og:title", content: "Alerts — CB67 Labs Control Center" },
      { property: "og:description", content: "Firing, acknowledged and resolved platform alerts." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const alerts = useQuery(q.alerts());
  const action = useAdminAction();
  const [target, setTarget] = useState<Alert | null>(null);
  const rows = alerts.data ?? [];

  const bySeverity = ["critical", "high", "medium", "low", "info"].map((severity) => ({
    t: severity,
    value: rows.filter((row) => row.severity === severity).length,
  }));

  const columns: Column<Alert>[] = [
    {
      id: "name",
      header: "Alert",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.source}</code>
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
      cell: (row) => <span className="tabular">{row.duration}</span>,
      align: "right",
    },
    {
      id: "state",
      header: "State",
      cell: (row) => <StatusBadge status={row.state} />,
      sortValue: (row) => row.state,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.state === "firing" ? (
          <Permitted permission="observability:write">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setTarget(row);
              }}
            >
              Acknowledge
            </Button>
          </Permitted>
        ) : null,
      align: "right",
    },
  ];

  const firing = rows.filter((row) => row.state === "firing");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alerts"
        description="Alerts are evaluated by the observability stack. Acknowledging an alert silences notifications without resolving the underlying condition."
        meta={<StatusBadge status={firing.length > 0 ? "firing" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Firing"
          value={firing.length}
          tone={firing.length > 0 ? "crit" : "ok"}
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Acknowledged"
          value={rows.filter((row) => row.state === "acknowledged").length}
          tone="warn"
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Resolved"
          value={rows.filter((row) => row.state === "resolved").length}
          tone="ok"
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Distinct sources"
          value={new Set(rows.map((row) => row.source)).size}
          isLoading={alerts.isLoading}
        />
      </div>

      <ChartPanel
        title="Alerts by severity"
        description="Composition of the current alert inventory."
        isLoading={alerts.isLoading}
        error={alerts.error ?? undefined}
        isEmpty={bySeverity.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={bySeverity} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Alert inventory" description="Sorted by severity or start time." />
        <DataTable
          data={alerts.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={alerts.isLoading}
          error={alerts.error ?? undefined}
          searchPlaceholder="Search alert or source…"
          searchValue={(row) => `${row.name} ${row.source}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Acknowledge alert"
        warning="Notifications for this alert are silenced until it resolves and fires again. The underlying condition is unchanged."
        details={
          target
            ? [
                { label: "Alert", value: target.name },
                { label: "Severity", value: target.severity },
                { label: "Firing for", value: target.duration },
              ]
            : undefined
        }
        confirmLabel="Acknowledge"
        destructive={false}
        environmentNotice="Acknowledgement is recorded with the operator identity in the audit trail."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "alert.acknowledge", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
