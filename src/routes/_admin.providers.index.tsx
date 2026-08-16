import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { formatCompact, formatMs, formatNumber, formatRelative } from "@/utils/format";
import type { CredentialMetadata, Provider } from "@/types";

export const Route = createFileRoute("/_admin/providers/")({
  head: () => ({
    meta: [
      { title: "Provedores Externos — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Saúde, tráfego e inventário de credenciais dos provedores externos intermediados pela plataforma de API CB67 Labs.",
      },
      { property: "og:title", content: "Provedores Externos — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Saúde da integração e pressão de cota do OpenAI, Gemini e Google Maps.",
      },
    ],
  }),
  component: ProvidersOverview,
});

function ProvidersOverview() {
  const providers = useQuery(q.providers());
  const credentials = useQuery(q.credentials());
  const rows = providers.data ?? [];

  const requests = rows.reduce((sum, row) => sum + row.requests24h, 0);
  const errors = rows.reduce((sum, row) => sum + row.errors24h, 0);
  const rateLimited = rows.reduce((sum, row) => sum + row.rateLimited24h, 0);

  const chart = rows.map((row) => ({ t: row.name, value: row.requests24h }));

  const columns: Column<Provider>[] = [
    {
      id: "name",
      header: "Provedor",
      cell: (row) => (
        <AppLink to={`/providers/${row.id}`} className="text-sm font-medium hover:underline">
          {row.name}
        </AppLink>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "requests",
      header: "Requisições 24h",
      cell: (row) => <span className="tabular">{formatCompact(row.requests24h)}</span>,
      sortValue: (row) => row.requests24h,
      align: "right",
    },
    {
      id: "errors",
      header: "Erros 24h",
      cell: (row) => (
        <span className={row.errors24h > 0 ? "tabular text-warn" : "tabular"}>
          {formatNumber(row.errors24h)}
        </span>
      ),
      sortValue: (row) => row.errors24h,
      align: "right",
    },
    {
      id: "rateLimited",
      header: "Limitado por taxa",
      cell: (row) => <span className="tabular">{formatNumber(row.rateLimited24h)}</span>,
      sortValue: (row) => row.rateLimited24h,
      align: "right",
    },
    {
      id: "p95",
      header: "p95",
      cell: (row) => <span className="tabular">{formatMs(row.p95Ms)}</span>,
      sortValue: (row) => row.p95Ms,
      align: "right",
    },
    {
      id: "projects",
      header: "Projetos",
      cell: (row) => <span className="tabular">{row.projects}</span>,
      sortValue: (row) => row.projects,
      align: "right",
    },
    {
      id: "credentials",
      header: "Credenciais",
      cell: (row) => <span className="tabular">{row.credentials}</span>,
      sortValue: (row) => row.credentials,
      align: "right",
    },
    {
      id: "lastSuccess",
      header: "Último sucesso",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSuccessAt)}</span>
      ),
      sortValue: (row) => row.lastSuccessAt,
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  const credentialColumns: Column<CredentialMetadata>[] = [
    {
      id: "alias",
      header: "Alias",
      cell: (row) => <code className="mono-xs text-foreground">{row.alias}</code>,
      sortValue: (row) => row.alias,
    },
    {
      id: "provider",
      header: "Provedor",
      cell: (row) => row.providerId,
      sortValue: (row) => row.providerId,
    },
    {
      id: "application",
      header: "Aplicação",
      cell: (row) => <span className="text-sm">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
    },
    {
      id: "environment",
      header: "Ambiente",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "rotated",
      header: "Última rotação",
      cell: (row) => <span className="mono-xs">{formatRelative(row.lastRotatedAt)}</span>,
      sortValue: (row) => row.lastRotatedAt,
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provedores Externos"
        description="A plataforma intermedia toda chamada upstream para que os consumidores nunca tenham acesso às credenciais do provedor. Incidentes de provedor são isolados dos relatórios de disponibilidade da plataforma."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Provedores integrados"
          value={rows.length}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Requisições upstream 24h"
          value={formatCompact(requests)}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Erros upstream 24h"
          value={formatNumber(errors)}
          tone={errors > 0 ? "warn" : "ok"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Limitação de provedor"
          value={formatNumber(rateLimited)}
          tone={rateLimited > 0 ? "warn" : "ok"}
          hint="Respostas 429 retornadas upstream"
          isLoading={providers.isLoading}
        />
      </div>

      <ChartPanel
        title="Distribuição de tráfego"
        description="Requisições intermediadas por provedor nas últimas 24 horas."
        isLoading={providers.isLoading}
        error={providers.error ?? undefined}
        isEmpty={chart.length === 0}
      >
        <CategoryBarChart data={chart} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Registro de provedores"
          description="Selecione um provedor para ver detalhes por projeto."
        />
        <DataTable
          data={providers.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={providers.isLoading}
          error={providers.error ?? undefined}
          dense
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Inventário de credenciais"
          description="Apenas metadados. O material secreto nunca é retornado a esta interface."
        />
        <DataTable
          data={credentials.data}
          columns={credentialColumns}
          rowKey={(row) => row.id}
          isLoading={credentials.isLoading}
          error={credentials.error ?? undefined}
          searchPlaceholder="Pesquisar alias ou aplicação…"
          searchValue={(row) => `${row.alias} ${row.applicationName}`}
          pageSize={10}
        />
      </div>
    </div>
  );
}
