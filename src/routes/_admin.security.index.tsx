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
      { title: "Visão Geral de Segurança — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Postura de autenticação e autorização: rejeições mTLS, tokens inválidos, respostas não autorizadas e proibidas, limitação de taxa e clientes suspeitos.",
      },
      { property: "og:title", content: "Visão Geral de Segurança — CB67 Labs Control Center" },
      { property: "og:description", content: "Rejeições, negações e atividade de clientes suspeitos." },
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
    },
    {
      id: "client",
      header: "Cliente",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
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
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral de Segurança"
        description="Cada rejeição é contabilizada na borda antes que a lógica de negócio seja executada. Negações são tráfego esperado em uma plataforma de menor privilégio; o crescimento sustentado é o sinal que merece investigação."
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
          label="Não autorizado (401)"
          value={data ? formatNumber(data.unauthorized) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Proibido (403)"
          value={data ? formatNumber(data.forbidden) : "—"}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Limitados por taxa"
          value={data ? formatNumber(data.rateLimited) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Tentativas com certificado revogado"
          value={data ? formatNumber(data.revokedCertAttempts) : "—"}
          tone={data && data.revokedCertAttempts > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Falhas de login de administrador"
          value={data ? formatNumber(data.adminLoginFailures) : "—"}
          tone={data && data.adminLoginFailures > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Clientes suspeitos"
          value={data ? formatNumber(data.suspiciousClients) : "—"}
          tone={data && data.suspiciousClients > 0 ? "crit" : "ok"}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Resultados de autenticação"
          description="Tentativas de autenticação bem-sucedidas e rejeitadas ao longo do tempo."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authChart.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={data?.authChart ?? []}
            series={[{ key: "value", label: "Rejeições" }]}
            variant="line"
          />
        </ChartPanel>
        <ChartPanel
          title="Negações de autorização"
          description="Requisições rejeitadas por escopo ou função ausente."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authorizationChart.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.authorizationChart ?? []} colorByIndex />
        </ChartPanel>
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Perímetro</h3>
        <dl className="mt-2">
          <StatRow
            label="Firewall"
            value={firewall.data ? <StatusBadge status={firewall.data.status} /> : "—"}
          />
          <StatRow label="Política padrão" value={firewall.data?.policy ?? "—"} />
          <StatRow label="Regras ativas" value={firewall.data?.rulesCount ?? "—"} />
          <StatRow label="Bloqueios recentes" value={firewall.data?.recentBlocks ?? "—"} />
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Regras detalhadas estão disponíveis em{" "}
          <AppLink to="/security/firewall" className="text-primary hover:underline">
            Segurança → Firewall
          </AppLink>
          .
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Eventos de segurança recentes"
          description="Entradas mais recentes; o fluxo completo está em Segurança → Eventos de Segurança."
          actions={
            <AppLink to="/security/events" className="text-xs text-primary hover:underline">
              Todos os eventos
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
