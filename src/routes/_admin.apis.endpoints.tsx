import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { MethodBadge } from "@/components/common/method-badge";
import {
  formatCompact,
  formatMs,
  formatPercent,
  formatMsOrNull,
  formatPercentOrNull,
  NOT_MEASURED,
} from "@/utils/format";
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
    {
      id: "version",
      header: "Versão",
      cell: (row) => <span className="mono-xs">{row.version}</span>,
      sortValue: (row) => row.version,
    },
    {
      id: "scope",
      header: "Escopo exigido",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.scope}</code>,
    },
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
      cell: (row) => <span className="tabular">{formatMsOrNull(row.p95Ms)}</span>,
      // Unmeasured sorts below every measured value rather than alongside a
      // genuine 0 ms, which would be a different and untrue claim.
      sortValue: (row) => row.p95Ms ?? -1,
      align: "right",
    },
    {
      id: "errorRate",
      header: "Taxa de erro",
      cell: (row) => (
        <span className={(row.errorRate ?? 0) > 1 ? "tabular text-warn" : "tabular"}>
          {formatPercentOrNull(row.errorRate)}
        </span>
      ),
      sortValue: (row) => row.errorRate ?? -1,
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

  // Only endpoints with a measured p95 can be ranked by it. Including the
  // unmeasured ones would let an endpoint that has served nothing be announced
  // as the fastest, or — with a null coerced to 0 — as the slowest.
  const measured = rows.filter((r): r is typeof r & { p95Ms: number } => r.p95Ms !== null);
  const slowest = [...measured].sort((a, b) => b.p95Ms - a.p95Ms)[0];

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
          value={slowest ? formatMs(slowest.p95Ms) : NOT_MEASURED}
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
        searchPlaceholder="Pesquisar caminhos, escopos…"
        pageSize={15}
      />
    </div>
  );
}
