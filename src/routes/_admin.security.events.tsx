import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { cn } from "@/lib/utils";
import { formatDateTime } from "@/utils/format";
import type { SecurityEvent, Severity } from "@/types";

export const Route = createFileRoute("/_admin/security/events")({
  head: () => ({
    meta: [
      { title: "Security Events — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Full security event stream with severity, category, originating client, source address and the correlated request identifier.",
      },
      { property: "og:title", content: "Security Events — CB67 Labs Control Center" },
      { property: "og:description", content: "Severity-filtered security event stream." },
    ],
  }),
  component: SecurityEventsPage,
});

const SEVERITIES: (Severity | "all")[] = ["all", "critical", "high", "medium", "low", "info"];

function SecurityEventsPage() {
  const events = useQuery(q.securityEvents());
  const [severity, setSeverity] = useState<Severity | "all">("all");

  const all = events.data ?? [];
  const rows = severity === "all" ? all : all.filter((event) => event.severity === severity);

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
      sortValue: (row) => row.source,
    },
    {
      id: "request",
      header: "Request",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
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
        title="Security Events"
        description="Every event carries the request identifier so it can be correlated with the API request explorer and the audit trail."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Events" value={all.length} isLoading={events.isLoading} />
        <MetricCard
          label="Critical"
          value={all.filter((row) => row.severity === "critical").length}
          tone="crit"
          isLoading={events.isLoading}
        />
        <MetricCard
          label="High"
          value={all.filter((row) => row.severity === "high").length}
          tone="warn"
          isLoading={events.isLoading}
        />
        <MetricCard
          label="Denied"
          value={all.filter((row) => row.decision === "denied").length}
          isLoading={events.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Event stream"
          description="Filter by severity, then search by client, source or request identifier."
        />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          searchPlaceholder="Search client, source, request…"
          searchValue={(row) => `${row.clientId} ${row.source} ${row.requestId} ${row.event}`}
          pageSize={20}
          dense
          toolbar={
            <div role="group" aria-label="Severity filter" className="inline-flex overflow-hidden rounded-md border border-border">
              {SEVERITIES.map((value) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={severity === value}
                  onClick={() => setSeverity(value)}
                  className={cn(
                    "px-2.5 py-1 text-xs font-medium transition-colors",
                    severity === value
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:bg-muted",
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          }
        />
      </div>
    </div>
  );
}
