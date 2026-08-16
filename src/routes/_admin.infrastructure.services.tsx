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
      { title: "Serviços — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Saúde dos serviços de plano de controle e de dados da plataforma CB67 Labs: gateway, licenciamento, PKI, banco de dados e stack de observabilidade.",
      },
      { property: "og:title", content: "Serviços — CB67 Labs Control Center" },
      { property: "og:description", content: "Saúde de todos os serviços da plataforma." },
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
      header: "Serviço",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "detail",
      header: "Detalhe",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.detail}</span>,
    },
    {
      id: "uptime",
      header: "Uptime",
      cell: (row) => <span className="mono-xs">{row.uptime}</span>,
      sortValue: (row) => row.uptime,
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
        title="Serviços"
        description="Unidades systemd e contêineres que compõem a plataforma. As operações de reinício e recarga são realizadas pelo runbook de operações, não por esta interface."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard
          label="Saudáveis"
          value={rows.filter((r) => r.status === "healthy").length}
          tone="ok"
          isLoading={services.isLoading}
        />
        <MetricCard
          label="Degradados"
          value={rows.filter((r) => r.status === "degraded").length}
          tone="warn"
          isLoading={services.isLoading}
        />
        <MetricCard
          label="Indisponíveis"
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
        searchPlaceholder="Pesquisar serviços…"
        pageSize={20}
      />
    </div>
  );
}
