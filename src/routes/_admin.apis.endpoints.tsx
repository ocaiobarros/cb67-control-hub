import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { MethodBadge } from "@/components/common/method-badge";
import { formatCompact, formatMs, formatPercent } from "@/utils/format";
import type { ApiEndpoint } from "@/types";

export const Route = createFileRoute("/_admin/apis/endpoints")({
  head: () => ({
    meta: [
      { title: "Endpoints da API — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Catálogo de endpoints publicados da API CB67 Labs com versão, escopo exigido, tráfego, latência e taxa de erro.",
      },
      { property: "og:title", content: "Endpoints da API — CB67 Labs Control Center" },
      { property: "og:description", content: "Versão, escopo exigido, tráfego, latência, erros." },
    ],
  }),
  component: EndpointsPage,
});

function EndpointsPage() {
  const endpoints = useQuery(q.endpoints());
  const rows = endpoints.data ?? [];

  const columns: Column<ApiEndpoint>[] = [
    {
      id: "path",
      header: "Endpoint",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <MethodBadge method={row.method} />
          <code className="mono-xs text-foreground">{row.path}</code>
        </div>
      ),
      sortValue: (row) => row.path,
    },
    { id: "version", header: "Versão", cell: (row) => <span className="mono-xs">{row.version}</span>, sortValue: (row) => row.version },
    { id: "scope", header: "Escopo exigido", cell: (row) => <code className="mono-xs text-muted-foreground">{row.scope}</code> },
    {
      id: "requests24h",
      header: "Requisições 24h",
      cell: (row) => <span className="tabular">{formatCompact(row.requests24h)}</span>,
      sortValue: (row) => row.requests24h,
      align: "right",
    },
    {
      id: "p95Ms",
      header: "p95",
      cell: (row) => <span className="tabular">{formatMs(row.p95Ms)}</span>,
      sortValue: (row) => row.p95Ms,
      align: "right",
    },
    {
      id: "errorRate",
      header: "Taxa de erro",
      cell: (row) => (
        <span className={row.errorRate > 1 ? "tabular text-warn" : "tabular"}>
          {formatPercent(row.errorRate)}
        </span>
      ),
      sortValue: (row) => row.errorRate,
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

  const slowest = [...rows].sort((a, b) => b.p95Ms - a.p95Ms)[0];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Endpoints da API"
        description="Superfície de contrato exposta a consumidores SaaS. Todo endpoint exige um escopo explícito; versões descontinuadas permanecem listadas até que a remoção seja anunciada no changelog."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Publicados" value={rows.length} isLoading={endpoints.isLoading} />
        <MetricCard
          label="Degradados"
          value={rows.filter((r) => r.status !== "healthy").length}
          tone="warn"
          isLoading={endpoints.isLoading}
        />
        <MetricCard
          label="Tráfego 24h"
          value={formatCompact(rows.reduce((sum, row) => sum + row.requests24h, 0))}
          isLoading={endpoints.isLoading}
        />
        <MetricCard
          label="p95 mais lento"
          value={slowest ? formatMs(slowest.p95Ms) : "—"}
          hint={slowest?.path}
          isLoading={endpoints.isLoading}
        />
      </div>

      <DataTable
        data={endpoints.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={endpoints.isLoading}
        error={endpoints.error ?? undefined}
        searchPlaceholder="Buscar caminhos, escopos…"
        pageSize={15}
      />
    </div>
  );
}
