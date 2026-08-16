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
import type { LogEntry } from "@/types";

export const Route = createFileRoute("/_admin/observability/logs")({
  head: () => ({
    meta: [
      { title: "Logs — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Structured platform log stream filtered by level and service, correlated with request and client identifiers.",
      },
      { property: "og:title", content: "Logs — CB67 Labs Control Center" },
      { property: "og:description", content: "Structured log stream with level and service filters." },
    ],
  }),
  component: LogsPage,
});

const LEVELS: (LogEntry["level"] | "all")[] = ["all", "error", "warn", "info", "debug"];

function LogsPage() {
  const logs = useQuery(q.logs());
  const [level, setLevel] = useState<LogEntry["level"] | "all">("all");
  const [service, setService] = useState<string>("all");

  const all = logs.data ?? [];
  const services = ["all", ...new Set(all.map((row) => row.service))];
  const rows = all.filter(
    (row) => (level === "all" || row.level === level) && (service === "all" || row.service === service),
  );

  const columns: Column<LogEntry>[] = [
    {
      id: "timestamp",
      header: "When",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "level",
      header: "Level",
      cell: (row) => <StatusBadge status={row.level} />,
      sortValue: (row) => row.level,
    },
    {
      id: "service",
      header: "Service",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.service}</code>,
      sortValue: (row) => row.service,
    },
    {
      id: "message",
      header: "Message",
      cell: (row) => <p className="max-w-xl text-sm break-words">{row.message}</p>,
    },
    {
      id: "client",
      header: "Client",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
      hideByDefault: true,
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
        title="Logs"
        description="Logs are structured and correlated by request identifier. This surface is read-only: it never accepts free-form queries against the log backend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Entries" value={all.length} isLoading={logs.isLoading} />
        <MetricCard
          label="Errors"
          value={all.filter((row) => row.level === "error").length}
          tone="crit"
          isLoading={logs.isLoading}
        />
        <MetricCard
          label="Warnings"
          value={all.filter((row) => row.level === "warn").length}
          tone="warn"
          isLoading={logs.isLoading}
        />
        <MetricCard label="Services reporting" value={services.length - 1} isLoading={logs.isLoading} />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Log stream" description="Filter by level and service, then search the message body." />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={logs.isLoading}
          error={logs.error ?? undefined}
          searchPlaceholder="Search message, request or client…"
          searchValue={(row) => `${row.message} ${row.requestId} ${row.clientId}`}
          pageSize={20}
          dense
          toolbar={
            <div className="flex flex-wrap items-center gap-2">
              <div role="group" aria-label="Log level" className="inline-flex overflow-hidden rounded-md border border-border">
                {LEVELS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={level === value}
                    onClick={() => setLevel(value)}
                    className={cn(
                      "px-2.5 py-1 text-xs font-medium transition-colors",
                      level === value
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                <span className="sr-only">Service</span>
                <select
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                  aria-label="Filter by service"
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs"
                >
                  {services.map((value) => (
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
