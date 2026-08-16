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
      { title: "Eventos de Segurança — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Fluxo completo de eventos de segurança com severidade, categoria, cliente de origem, endereço de origem e o identificador de requisição correlacionado.",
      },
      { property: "og:title", content: "Eventos de Segurança — CB67 Labs Control Center" },
      { property: "og:description", content: "Fluxo de eventos de segurança filtrado por severidade." },
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
      header: "Quando",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "event",
      header: "Evento",
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
      header: "Cliente",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
      sortValue: (row) => row.clientId,
    },
    {
      id: "source",
      header: "Origem",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      sortValue: (row) => row.source,
    },
    {
      id: "request",
      header: "Requisição",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
    },
    {
      id: "severity",
      header: "Severidade",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
      align: "right",
    },
    {
      id: "decision",
      header: "Decisão",
      cell: (row) => <StatusBadge status={row.decision} />,
      sortValue: (row) => row.decision,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Eventos de Segurança"
        description="Cada evento carrega o identificador de requisição para que possa ser correlacionado com o explorador de requisições da API e a trilha de auditoria."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Eventos" value={all.length} isLoading={events.isLoading} />
        <MetricCard
          label="Crítico"
          value={all.filter((row) => row.severity === "critical").length}
          tone="crit"
          isLoading={events.isLoading}
        />
        <MetricCard
          label="Alto"
          value={all.filter((row) => row.severity === "high").length}
          tone="warn"
          isLoading={events.isLoading}
        />
        <MetricCard
          label="Negados"
          value={all.filter((row) => row.decision === "denied").length}
          isLoading={events.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Fluxo de eventos"
          description="Filtre por severidade, depois busque por cliente, origem ou identificador de requisição."
        />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          searchPlaceholder="Pesquisar cliente, origem, requisição…"
          searchValue={(row) => `${row.clientId} ${row.source} ${row.requestId} ${row.event}`}
          pageSize={20}
          dense
          toolbar={
            <div role="group" aria-label="Filtro de severidade" className="inline-flex overflow-hidden rounded-md border border-border">
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
