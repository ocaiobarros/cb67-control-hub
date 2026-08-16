import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { cn } from "@/lib/utils";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { AuditEvent } from "@/types";

export const Route = createFileRoute("/_admin/audit")({
  head: () => ({
    meta: [
      { title: "Audit Trail — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Append-only audit trail of operator, machine and system actions across the CB67 Labs platform, correlated by request identifier.",
      },
      { property: "og:title", content: "Audit Trail — CB67 Labs Control Center" },
      { property: "og:description", content: "Append-only record of every privileged action on the platform." },
    ],
  }),
  component: AuditPage,
});

const RESULTS: (AuditEvent["result"] | "all")[] = ["all", "success", "denied", "failure"];

function AuditPage() {
  const audit = useQuery(q.auditEvents());
  const [result, setResult] = useState<AuditEvent["result"] | "all">("all");
  const [actorType, setActorType] = useState<string>("all");

  const all = audit.data ?? [];
  const actorTypes = ["all", "administrator", "machine", "system"];
  const rows = all.filter(
    (row) =>
      (result === "all" || row.result === result) &&
      (actorType === "all" || row.actorType === actorType),
  );

  const byResource = [...new Set(all.map((row) => row.resource))]
    .map((resource) => ({ t: resource, value: all.filter((row) => row.resource === resource).length }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const columns: Column<AuditEvent>[] = [
    {
      id: "timestamp",
      header: "When",
      cell: (row) => (
        <div>
          <span className="mono-xs">{formatDateTime(row.timestamp)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.timestamp)}</p>
        </div>
      ),
      sortValue: (row) => row.timestamp,
    },
    {
      id: "actor",
      header: "Actor",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.actor}</p>
          <span className="mono-xs text-muted-foreground">{row.actorType}</span>
        </div>
      ),
      sortValue: (row) => row.actor,
    },
    {
      id: "action",
      header: "Action",
      cell: (row) => <code className="mono-xs text-foreground">{row.action}</code>,
      sortValue: (row) => row.action,
    },
    {
      id: "resource",
      header: "Resource",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.resource}</p>
          <code className="mono-xs text-muted-foreground">{row.resourceId}</code>
        </div>
      ),
      sortValue: (row) => row.resource,
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      hideByDefault: true,
    },
    {
      id: "result",
      header: "Result",
      cell: (row) => <StatusBadge status={row.result} />,
      sortValue: (row) => row.result,
      align: "right",
    },
    {
      id: "request",
      header: "Request",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audit Trail"
        description="Every privileged action is recorded by the backend with the acting identity, source address and correlating request identifier. The record is append-only; this surface cannot alter or delete it."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Events" value={all.length} isLoading={audit.isLoading} />
        <MetricCard
          label="Denied"
          value={all.filter((row) => row.result === "denied").length}
          tone="warn"
          isLoading={audit.isLoading}
        />
        <MetricCard
          label="Failures"
          value={all.filter((row) => row.result === "failure").length}
          tone="crit"
          isLoading={audit.isLoading}
        />
        <MetricCard
          label="Distinct actors"
          value={new Set(all.map((row) => row.actor)).size}
          isLoading={audit.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_1fr]">
        <ChartPanel
          title="Activity by resource"
          description="Where privileged activity concentrates."
          isLoading={audit.isLoading}
          error={audit.error ?? undefined}
          isEmpty={byResource.length === 0}
        >
          <CategoryBarChart data={byResource} layout="horizontal" colorByIndex />
        </ChartPanel>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Record properties</h3>
          <dl className="mt-2">
            <StatRow label="Mutability" value="Append-only, no operator deletion path" />
            <StatRow label="Retention" value="18 months, monthly partitions" />
            <StatRow label="Correlation" value="Request identifier shared with logs and API traces" />
            <StatRow label="Export" value="Owned by the backend; not exposed in this UI" />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Event stream" description="Filter by result and actor type, then search actor, action or resource." />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={audit.isLoading}
          error={audit.error ?? undefined}
          searchPlaceholder="Search actor, action, resource or request…"
          searchValue={(row) =>
            `${row.actor} ${row.action} ${row.resource} ${row.resourceId} ${row.requestId} ${row.source}`
          }
          pageSize={20}
          dense
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Result" className="inline-flex overflow-hidden rounded-md border border-border">
                {RESULTS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={result === value}
                    onClick={() => setResult(value)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium transition-colors",
                      result === value ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="sr-only">Actor type</span>
                <select
                  value={actorType}
                  onChange={(event) => setActorType(event.target.value)}
                  aria-label="Filter by actor type"
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {actorTypes.map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          }
        />
      </div>
    </div>
  );
}
