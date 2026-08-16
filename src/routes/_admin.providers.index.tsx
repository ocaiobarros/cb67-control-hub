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
      { title: "External Providers — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Health, traffic and credential inventory for the external providers proxied by the CB67 Labs API platform.",
      },
      { property: "og:title", content: "External Providers — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "OpenAI, Gemini and Google Maps integration health and quota pressure.",
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
      header: "Provider",
      cell: (row) => (
        <AppLink to={`/providers/${row.id}`} className="text-sm font-medium hover:underline">
          {row.name}
        </AppLink>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "requests",
      header: "Requests 24h",
      cell: (row) => <span className="tabular">{formatCompact(row.requests24h)}</span>,
      sortValue: (row) => row.requests24h,
      align: "right",
    },
    {
      id: "errors",
      header: "Errors 24h",
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
      header: "Rate limited",
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
      header: "Projects",
      cell: (row) => <span className="tabular">{row.projects}</span>,
      sortValue: (row) => row.projects,
      align: "right",
    },
    {
      id: "credentials",
      header: "Credentials",
      cell: (row) => <span className="tabular">{row.credentials}</span>,
      sortValue: (row) => row.credentials,
      align: "right",
    },
    {
      id: "lastSuccess",
      header: "Last success",
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
    { id: "provider", header: "Provider", cell: (row) => row.providerId, sortValue: (row) => row.providerId },
    {
      id: "application",
      header: "Application",
      cell: (row) => <span className="text-sm">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
    },
    {
      id: "environment",
      header: "Environment",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "rotated",
      header: "Last rotated",
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
        title="External Providers"
        description="The platform brokers every upstream call so consumers never hold provider credentials. Provider incidents are isolated from platform availability reporting."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Integrated providers" value={rows.length} isLoading={providers.isLoading} />
        <MetricCard
          label="Upstream requests 24h"
          value={formatCompact(requests)}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Upstream errors 24h"
          value={formatNumber(errors)}
          tone={errors > 0 ? "warn" : "ok"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Provider throttling"
          value={formatNumber(rateLimited)}
          tone={rateLimited > 0 ? "warn" : "ok"}
          hint="429 responses returned upstream"
          isLoading={providers.isLoading}
        />
      </div>

      <ChartPanel
        title="Traffic distribution"
        description="Requests brokered per provider in the last 24 hours."
        isLoading={providers.isLoading}
        error={providers.error ?? undefined}
        isEmpty={chart.length === 0}
      >
        <CategoryBarChart data={chart} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Provider registry" description="Select a provider for project-level detail." />
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
          title="Credential inventory"
          description="Metadata only. Secret material is never returned to this interface."
        />
        <DataTable
          data={credentials.data}
          columns={credentialColumns}
          rowKey={(row) => row.id}
          isLoading={credentials.isLoading}
          error={credentials.error ?? undefined}
          searchPlaceholder="Search alias or application…"
          searchValue={(row) => `${row.alias} ${row.applicationName}`}
          pageSize={10}
        />
      </div>
    </div>
  );
}
