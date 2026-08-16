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
          "Fluxo estruturado de logs da plataforma filtrado por nível e serviço, correlacionado com identificadores de requisição e cliente.",
      },
      { property: "og:title", content: "Logs — CB67 Labs Control Center" },
      { property: "og:description", content: "Fluxo estruturado de logs com filtros de nível e serviço." },
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
      header: "Quando",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "level",
      header: "Nível",
      cell: (row) => <StatusBadge status={row.level} />,
      sortValue: (row) => row.level,
    },
    {
      id: "service",
      header: "Serviço",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.service}</code>,
      sortValue: (row) => row.service,
    },
    {
      id: "message",
      header: "Mensagem",
      cell: (row) => <p className="max-w-xl text-sm break-words">{row.message}</p>,
    },
    {
      id: "client",
      header: "Cliente",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
      hideByDefault: true,
    },
    {
      id: "request",
      header: "Requisição",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Logs"
        description="Os logs são estruturados e correlacionados por identificador de requisição. Esta superfície é somente leitura: nunca aceita consultas livres contra o backend de logs."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Entradas" value={all.length} isLoading={logs.isLoading} />
        <MetricCard
          label="Erros"
          value={all.filter((row) => row.level === "error").length}
          tone="crit"
          isLoading={logs.isLoading}
        />
        <MetricCard
          label="Avisos"
          value={all.filter((row) => row.level === "warn").length}
          tone="warn"
          isLoading={logs.isLoading}
        />
        <MetricCard label="Serviços reportando" value={services.length - 1} isLoading={logs.isLoading} />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Fluxo de logs" description="Filtre por nível e serviço, depois pesquise o corpo da mensagem." />
        <DataTable
          data={rows}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={logs.isLoading}
          error={logs.error ?? undefined}
          searchPlaceholder="Buscar mensagem, requisição ou cliente…"
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
                <span className="sr-only">Serviço</span>
                <select
                  value={service}
                  onChange={(event) => setService(event.target.value)}
                  aria-label="Filtrar por serviço"
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
