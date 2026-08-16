import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import type { ServiceHealth } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/services")({
  head: () => ({
    meta: [
      { title: "Services — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Control-plane and data-plane service health for the CB67 Labs platform: gateway, licensing, PKI, database and observability stack.",
      },
      { property: "og:title", content: "Services — CB67 Labs Control Center" },
      { property: "og:description", content: "Health of every platform service." },
    ],
  }),
  component: ServicesPage,
});

function ServicesPage() {
  const services = useQuery(q.services());
  const rows = services.data ?? [];

  const columns: Column<ServiceHealth>[] = [
    {
      id: "name",
      header: "Service",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    { id: "detail", header: "Detail", cell: (row) => <span className="text-xs text-muted-foreground">{row.detail}</span> },
    { id: "uptime", header: "Uptime", cell: (row) => <span className="mono-xs">{row.uptime}</span>, sortValue: (row) => row.uptime },
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
        title="Services"
        description="Systemd units and containers composing the platform. Restart and reload operations are performed by the operations runbook, not from this interface."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Healthy" value={rows.filter((r) => r.status === "healthy").length} tone="ok" isLoading={services.isLoading} />
        <MetricCard label="Degraded" value={rows.filter((r) => r.status === "degraded").length} tone="warn" isLoading={services.isLoading} />
        <MetricCard
          label="Unavailable"
          value={rows.filter((r) => r.status === "unavailable").length}
          tone="crit"
          isLoading={services.isLoading}
        />
      </div>

      <DataTable
        data={services.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={services.isLoading}
        error={services.error ?? undefined}
        searchPlaceholder="Search services…"
        pageSize={20}
      />
    </div>
  );
}
