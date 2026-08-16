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
      { title: "Autenticação — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Telemetria de autenticação para clientes de máquina e operadores: handshakes mTLS, validação de token e tentativas com certificado revogado.",
      },
      { property: "og:title", content: "Autenticação — CB67 Labs Control Center" },
      { property: "og:description", content: "Resultados de autenticação mTLS e por token." },
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
        title="Autenticação"
        description="A plataforma autentica clientes de máquina com TLS mútuo mais credenciais de cliente. Um handshake rejeitado nunca alcança a camada de API, então esses contadores vêm da borda."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="mTLS rejeitados"
          value={data ? formatNumber(data.mtlsRejected) : "—"}
          tone={data && data.mtlsRejected > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Tokens inválidos"
          value={data ? formatNumber(data.invalidTokens) : "—"}
          tone={data && data.invalidTokens > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Tentativas com certificado revogado"
          value={data ? formatNumber(data.revokedCertAttempts) : "—"}
          tone={data && data.revokedCertAttempts > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Falhas de login de operador"
          value={data ? formatNumber(data.adminLoginFailures) : "—"}
          isLoading={overview.isLoading}
        />
      </div>

      <ChartPanel
        title="Rejeições de autenticação"
        description="Rejeições registradas na fronteira de validação de TLS e token."
        isLoading={overview.isLoading}
        error={overview.error ?? undefined}
        isEmpty={(data?.authChart.length ?? 0) === 0}
        height={260}
      >
        <TimeSeriesChart
          data={data?.authChart ?? []}
          series={[{ key: "value", label: "Rejeições" }]}
        />
      </ChartPanel>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Modelo de autenticação</h3>
        <dl className="mt-2">
          <StatRow label="Clientes de máquina" value="TLS mútuo mais credenciais de cliente" />
          <StatRow label="Operadores" value="Identidade federada com sessões de curta duração" />
          <StatRow label="Tempo de vida do token" value="Controlado pelo backend (provisório)" />
          <StatRow label="Armazenamento de credenciais" value="Somente no servidor; nunca retornado a esta interface" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Eventos de autenticação"
          description="Filtrados do fluxo de eventos de segurança por categoria."
        />
        <DataTable
          data={authEvents}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="Nenhum evento de autenticação no conjunto de dados atual."
          searchPlaceholder="Pesquisar cliente, origem ou evento…"
          searchValue={(row) => `${row.clientId} ${row.source} ${row.event}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
