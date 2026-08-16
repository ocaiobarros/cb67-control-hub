import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, formatNumber, formatRelative } from "@/utils/format";
import type { SecurityEvent, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/security/failed-attempts")({
  head: () => ({
    meta: [
      { title: "Tentativas Falhas — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Tentativas repetidas de autenticação e autorização falhas agrupadas por cliente e endereço de origem para revelar padrões de abuso.",
      },
      { property: "og:title", content: "Tentativas Falhas — CB67 Labs Control Center" },
      { property: "og:description", content: "Padrões de abuso por cliente e endereço de origem." },
    ],
  }),
  component: FailedAttemptsPage,
});

interface Offender {
  key: string;
  clientId: string;
  source: string;
  attempts: number;
  lastAt: string;
  worstSeverity: string;
}

function FailedAttemptsPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.securityOverview(range));
  const events = useQuery(q.securityEvents());
  const data = overview.data;

  const denied = (events.data ?? []).filter((event) => event.decision === "denied");

  const offenders: Offender[] = Object.values(
    denied.reduce<Record<string, Offender>>((acc, event) => {
      const key = `${event.clientId}|${event.source}`;
      const current = acc[key];
      if (current) {
        current.attempts += 1;
        if (event.timestamp > current.lastAt) current.lastAt = event.timestamp;
        if (event.severity === "critical" || event.severity === "high") current.worstSeverity = event.severity;
      } else {
        acc[key] = {
          key,
          clientId: event.clientId,
          source: event.source,
          attempts: 1,
          lastAt: event.timestamp,
          worstSeverity: event.severity,
        };
      }
      return acc;
    }, {}),
  ).sort((a, b) => b.attempts - a.attempts);

  const bySource = offenders.slice(0, 8).map((row) => ({ t: row.source, value: row.attempts }));

  const offenderColumns: Column<Offender>[] = [
    {
      id: "client",
      header: "Cliente",
      cell: (row) => <code className="mono-xs text-foreground">{row.clientId}</code>,
      sortValue: (row) => row.clientId,
    },
    {
      id: "source",
      header: "Origem",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      sortValue: (row) => row.source,
    },
    {
      id: "attempts",
      header: "Tentativas falhas",
      cell: (row) => (
        <span className={row.attempts >= 5 ? "tabular text-crit" : "tabular"}>{row.attempts}</span>
      ),
      sortValue: (row) => row.attempts,
      align: "right",
    },
    {
      id: "severity",
      header: "Pior severidade",
      cell: (row) => <StatusBadge status={row.worstSeverity} />,
      sortValue: (row) => row.worstSeverity,
      align: "right",
    },
    {
      id: "last",
      header: "Última tentativa",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.lastAt)}</span>,
      sortValue: (row) => row.lastAt,
      align: "right",
    },
  ];

  const eventColumns: Column<SecurityEvent>[] = [
    {
      id: "timestamp",
      header: "Quando",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "event",
      header: "Tentativa",
      cell: (row) => <p className="text-sm">{row.event}</p>,
    },
    {
      id: "client",
      header: "Cliente",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
    },
    {
      id: "source",
      header: "Origem",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
    },
    {
      id: "severity",
      header: "Severidade",
      cell: (row) => <StatusBadge status={row.severity} />,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tentativas Falhas"
        description="Agrupar negações por cliente e endereço de origem separa uma integração mal configurada de uma tentativa deliberada de sondagem."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Tentativas falhas"
          value={denied.length}
          tone={denied.length > 0 ? "warn" : "ok"}
          isLoading={events.isLoading}
        />
        <MetricCard
          label="Origens distintas"
          value={new Set(denied.map((event) => event.source)).size}
          isLoading={events.isLoading}
        />
        <MetricCard
          label="Clientes suspeitos"
          value={data ? formatNumber(data.suspiciousClients) : "—"}
          tone={data && data.suspiciousClients > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Falhas de login de operador"
          value={data ? formatNumber(data.adminLoginFailures) : "—"}
          isLoading={overview.isLoading}
        />
      </div>

      <ChartPanel
        title="Tentativas por origem"
        description="Principais endereços de origem no conjunto de dados atual."
        isLoading={events.isLoading}
        error={events.error ?? undefined}
        isEmpty={bySource.length === 0}
      >
        <CategoryBarChart data={bySource} layout="horizontal" />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Infratores recorrentes"
          description="Cinco ou mais falhas do mesmo par justificam investigação."
        />
        <DataTable
          data={offenders}
          columns={offenderColumns}
          rowKey={(row) => row.key}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="Nenhuma tentativa falha registrada."
          searchPlaceholder="Pesquisar cliente ou origem…"
          searchValue={(row) => `${row.clientId} ${row.source}`}
          pageSize={10}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Registro de tentativas" description="Tentativas negadas individuais, mais recentes primeiro." />
        <DataTable
          data={denied}
          columns={eventColumns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="Nenhuma tentativa falha registrada."
          pageSize={15}
          dense
        />
      </div>
    </div>
  );
}
