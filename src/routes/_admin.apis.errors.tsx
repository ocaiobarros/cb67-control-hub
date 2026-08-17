import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import {
  formatCompact,
  formatDateTime,
  formatNumber,
  formatRelative,
  NOT_MEASURED,
  formatRelativeOrNull,
} from "@/utils/format";
import type { ApiErrorGroup } from "@/types";

export const Route = createFileRoute("/_admin/apis/errors")({
  head: () => ({
    meta: [
      { title: "Erros da API — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Falhas de API agrupadas por classe de status, taxa por minuto, clientes e endpoints afetados, com primeira e última ocorrência.",
      },
      { property: "og:title", content: "Erros da API — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Grupos de erro por classes 4xx, 5xx, timeout e falha de provedor.",
      },
    ],
  }),
  component: ApiErrorsPage,
});

const CLASS_LABEL: Record<ApiErrorGroup["statusClass"], string> = {
  "4xx": "Cliente (4xx)",
  "5xx": "Servidor (5xx)",
  timeout: "Timeout",
  provider: "Provedor",
};

function ApiErrorsPage() {
  const errors = useQuery(q.apiErrors());
  const rows = errors.data ?? [];

  const totals = rows.reduce(
    (acc, row) => {
      acc.count += row.count;
      acc.clients = Math.max(acc.clients, row.affectedClients);
      if (row.statusClass === "5xx" || row.statusClass === "timeout") acc.serverSide += row.count;
      return acc;
    },
    { count: 0, clients: 0, serverSide: 0 },
  );

  const byClass = (Object.keys(CLASS_LABEL) as ApiErrorGroup["statusClass"][]).map((key) => ({
    t: CLASS_LABEL[key],
    value: rows.filter((row) => row.statusClass === key).reduce((sum, row) => sum + row.count, 0),
  }));

  const byEndpoint = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      for (const endpoint of row.affectedEndpoints) {
        acc[endpoint] = (acc[endpoint] ?? 0) + row.count;
      }
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  const columns: Column<ApiErrorGroup>[] = [
    {
      id: "status",
      header: "Erro",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.status}</code>
          <p className="text-xs text-muted-foreground">{CLASS_LABEL[row.statusClass]}</p>
        </div>
      ),
      sortValue: (row) => row.status,
    },
    {
      id: "count",
      header: "Ocorrências",
      cell: (row) => <span className="tabular">{formatNumber(row.count)}</span>,
      sortValue: (row) => row.count,
      align: "right",
    },
    {
      id: "rate",
      header: "Por minuto",
      cell: (row) => (
        <span className="tabular">
          {row.ratePerMin === null ? NOT_MEASURED : row.ratePerMin.toFixed(2)}
        </span>
      ),
      sortValue: (row) => row.ratePerMin ?? -1,
      align: "right",
    },
    {
      id: "trend",
      header: "Tendência",
      cell: (row) =>
        // Null means the previous hour had none of this error, so there is no
        // baseline to compare against. Showing "0.0%" would report no change
        // for a group that went from nothing to something.
        row.trend === null ? (
          <span className="tabular text-muted-foreground">{NOT_MEASURED}</span>
        ) : (
          <span className={row.trend > 0 ? "tabular text-crit" : "tabular text-ok"}>
            {row.trend > 0 ? "+" : ""}
            {row.trend.toFixed(1)}%
          </span>
        ),
      sortValue: (row) => row.trend ?? Number.NEGATIVE_INFINITY,
      align: "right",
    },
    {
      id: "clients",
      header: "Clientes",
      cell: (row) => <span className="tabular">{row.affectedClients}</span>,
      sortValue: (row) => row.affectedClients,
      align: "right",
    },
    {
      id: "endpoints",
      header: "Endpoints",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.affectedEndpoints.map((endpoint) => (
            <code key={endpoint} className="mono-xs rounded border border-border px-1 py-0.5">
              {endpoint}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "firstSeen",
      header: "Primeira ocorrência",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.firstSeen)}</span>,
      sortValue: (row) => row.firstSeen,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Última ocorrência",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelativeOrNull(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen ?? "",
      align: "right",
    },
  ];

  const worst = [...rows].sort((a, b) => b.count - a.count)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Erros da API"
        description="As falhas são agrupadas por status normalizado para que condições recorrentes apareçam como um único sinal. Erros da classe provedor se originam upstream e não contam contra a disponibilidade da plataforma."
        meta={<StatusBadge status={totals.serverSide > 0 ? "degraded" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Grupos de erro"
          value={rows.length}
          isLoading={errors.isLoading}
          hint="Condições normalizadas distintas"
        />
        <MetricCard
          label="Ocorrências"
          value={formatCompact(totals.count)}
          isLoading={errors.isLoading}
        />
        <MetricCard
          label="Lado servidor"
          value={formatCompact(totals.serverSide)}
          tone={totals.serverSide > 0 ? "warn" : "ok"}
          hint="Classes 5xx e timeout"
          isLoading={errors.isLoading}
        />
        <MetricCard
          label="Principal condição"
          value={worst?.status ?? "—"}
          hint={worst ? `${formatNumber(worst.count)} ocorrências` : undefined}
          isLoading={errors.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Distribuição por classe"
          description="Onde as falhas se originam: requisição do consumidor, plataforma ou provedor upstream."
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          isEmpty={byClass.every((entry) => entry.value === 0)}
        >
          <CategoryBarChart data={byClass} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Endpoints mais afetados"
          description="Ocorrências atribuídas a cada endpoint na janela atual."
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          isEmpty={byEndpoint.length === 0}
        >
          <CategoryBarChart data={byEndpoint} layout="horizontal" />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Grupos de erro"
          description="Ordenado por ocorrências. Abra o explorador de requisições para inspecionar requisições correlacionadas individuais."
        />
        <DataTable
          data={errors.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={errors.isLoading}
          error={errors.error ?? undefined}
          searchPlaceholder="Pesquisar status ou endpoint…"
          searchValue={(row) => `${row.status} ${row.affectedEndpoints.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
