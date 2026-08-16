import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, formatNumber } from "@/utils/format";
import type { SecurityEvent, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/security/authorization")({
  head: () => ({
    meta: [
      { title: "Autorização — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Negações de autorização por escopo e função: respostas proibidas, escopos ausentes e os clientes mais frequentemente negados.",
      },
      { property: "og:title", content: "Autorização — CB67 Labs Control Center" },
      { property: "og:description", content: "Negações de escopo e função em toda a superfície da API." },
    ],
  }),
  component: AuthorizationPage,
});

function AuthorizationPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.securityOverview(range));
  const events = useQuery(q.securityEvents());
  const data = overview.data;

  const denied = (events.data ?? []).filter((event) => event.decision === "denied");

  const byClient = Object.entries(
    denied.reduce<Record<string, number>>((acc, event) => {
      acc[event.clientId] = (acc[event.clientId] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const columns: Column<SecurityEvent>[] = [
    {
      id: "timestamp",
      header: "Quando",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "event",
      header: "Operação negada",
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
      id: "requestId",
      header: "Requisição",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.requestId}</code>,
    },
    {
      id: "severity",
      header: "Severidade",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Autorização"
        description="A autorização é avaliada por requisição contra os escopos concedidos ao cliente solicitante. As negações são aplicadas no servidor; a interface apenas as reporta."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Proibido (403)"
          value={data ? formatNumber(data.forbidden) : "—"}
          tone={data && data.forbidden > 0 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Não autorizado (401)"
          value={data ? formatNumber(data.unauthorized) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Eventos negados"
          value={denied.length}
          isLoading={events.isLoading}
          hint="Do fluxo de eventos de segurança"
        />
        <MetricCard
          label="Clientes negados"
          value={new Set(denied.map((event) => event.clientId)).size}
          isLoading={events.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Negações por categoria"
          description="Quais verificações de autorização rejeitam com mais frequência."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.authorizationChart.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.authorizationChart ?? []} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Clientes mais negados"
          description="Negações repetidas geralmente significam que um escopo nunca foi concedido."
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          isEmpty={byClient.length === 0}
        >
          <CategoryBarChart data={byClient} layout="horizontal" />
        </ChartPanel>
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Modelo de autorização</h3>
        <dl className="mt-2">
          <StatRow label="Clientes de máquina" value="Baseado em escopo, menor privilégio por endpoint" />
          <StatRow label="Operadores" value="Baseado em função, permissões avaliadas por operação" />
          <StatRow label="Ponto de aplicação" value="Gateway de API e camada de serviço, nunca o navegador" />
          <StatRow label="Comportamento da interface" value="Ações são ocultadas, não meramente desabilitadas" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Requisições negadas" description="Correlacione com o explorador de requisições usando o identificador da requisição." />
        <DataTable
          data={denied}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={events.isLoading}
          error={events.error ?? undefined}
          emptyMessage="Nenhuma negação de autorização no conjunto de dados atual."
          searchPlaceholder="Buscar cliente, evento ou requisição…"
          searchValue={(row) => `${row.clientId} ${row.event} ${row.requestId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
