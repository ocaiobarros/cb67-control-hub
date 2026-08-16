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
      { title: "Request Explorer — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Recent CB67 Labs API requests with correlation ID, client, endpoint, upstream provider, status code and latency split.",
      },
      { property: "og:title", content: "Request Explorer — CB67 Labs Control Center" },
      { property: "og:description", content: "Correlation IDs, status codes and latency split." },
    ],
  }),
  component: RequestsPage,
});

function RequestsPage() {
  const requests = useQuery(q.requests());

  const columns: Column<ApiRequestRecord>[] = [
    {
      id: "timestamp",
      header: "Timestamp",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDateTime(row.timestamp)}</span>,
      sortValue: (row) => row.timestamp,
    },
    {
      id: "requestId",
      header: "Request ID",
      cell: (row) => <IdentifierCell value={row.requestId} label="request id" />,
      sortValue: (row) => row.requestId,
    },
    {
      id: "applicationName",
      header: "Client",
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
      header: "Latency",
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
        title="Request Explorer"
        description="Correlated request records as reported by the API gateway. Request IDs are propagated end-to-end and can be used to join gateway, application and provider logs."
      />

      <DataTable
        data={requests.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={requests.isLoading}
        error={requests.error ?? undefined}
        searchPlaceholder="Search request IDs, clients, endpoints…"
        pageSize={20}
      />

      <p className="text-xs text-muted-foreground">
        Payload bodies are intentionally not surfaced in this interface. Sensitive request content
        stays in the platform log pipeline under its own retention and access policy.
      </p>
    </div>
  );
}
