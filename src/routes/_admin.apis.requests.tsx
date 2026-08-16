import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MethodBadge, StatusCodeBadge } from "@/components/common/method-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { formatDateTime, formatMs } from "@/utils/format";
import type { ApiRequestRecord } from "@/types";

export const Route = createFileRoute("/_admin/apis/requests")({
  head: () => ({
    meta: [
      { title: "Explorador de Requisições — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Requisições recentes da API CB67 Labs com ID de correlação, cliente, endpoint, provedor upstream, código de status e divisão de latência.",
      },
      { property: "og:title", content: "Explorador de Requisições — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "IDs de correlação, códigos de status e divisão de latência.",
      },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const requests = useQuery(q.requests());

  const columns: Column<ApiRequestRecord>[] = [
    {
      id: "timestamp",
      header: "Data/hora",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatDateTime(row.timestamp)}</span>
      ),
      sortValue: (row) => row.timestamp,
    },
    {
      id: "requestId",
      header: "ID da requisição",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
      sortValue: (row) => row.requestId,
    },
    {
      id: "applicationName",
      header: "Cliente",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.applicationName}</p>
          <p className="mono-xs truncate text-muted-foreground">{row.clientId}</p>
        </div>
      ),
      sortValue: (row) => row.applicationName,
    },
    {
      id: "endpoint",
      header: "Endpoint",
      cell: (row) => (
        <div className="flex items-center gap-2">
          <MethodBadge method={row.method} />
          <code className="mono-xs">{row.endpoint}</code>
        </div>
      ),
      sortValue: (row) => row.endpoint,
    },
    {
      id: "provider",
      header: "Upstream",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{row.provider ?? "internal"}</span>
      ),
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusCodeBadge code={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      id: "latencyMs",
      header: "Latência",
      cell: (row) => (
        <div className="text-right">
          <span className="tabular">{formatMs(row.latencyMs)}</span>
          {row.providerLatencyMs !== null && (
            <p className="mono-xs text-muted-foreground">
              upstream {formatMs(row.providerLatencyMs)}
            </p>
          )}
        </div>
      ),
      sortValue: (row) => row.latencyMs,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Explorador de Requisições"
        description="Registros de requisições correlacionadas conforme reportado pelo gateway de API. Os IDs de requisição são propagados de ponta a ponta e podem ser usados para unir logs de gateway, aplicação e provedor."
      />

      <DataTable
        data={requests.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={requests.isLoading}
        error={requests.error ?? undefined}
        searchPlaceholder="Pesquisar IDs de requisição, clientes, endpoints…"
        pageSize={20}
      />

      <p className="text-xs text-muted-foreground">
        Os corpos de payload propositalmente não são exibidos nesta interface. O conteúdo sensível
        das requisições permanece no pipeline de logs da plataforma, sob sua própria política de
        retenção e acesso.
      </p>
    </div>
  );
}
