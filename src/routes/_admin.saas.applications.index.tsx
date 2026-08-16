import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatMs, formatPercent, formatRelative } from "@/utils/format";
import type { Application } from "@/types";

export const Route = createFileRoute("/_admin/saas/applications/")({
  head: () => ({
    meta: [
      { title: "Aplicações SaaS — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registro de aplicações SaaS consumindo a API da CB67 Labs: ambiente, licenciamento, postura de certificado e tráfego.",
      },
      { property: "og:title", content: "Aplicações SaaS — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Ambiente, licenciamento, postura de certificado e tráfego por aplicação.",
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const applications = useQuery(q.applications());
  const navigate = useNavigate();
  const rows = applications.data ?? [];

  const columns: Column<Application>[] = [
    {
      id: "name",
      header: "Aplicação",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="mono-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "environment",
      header: "Amb.",
      cell: (row) => (
        <Badge variant="outline" className="mono-xs">
          {row.environment}
        </Badge>
      ),
      sortValue: (row) => row.environment,
    },
    { id: "instances", header: "Instâncias", cell: (row) => <span className="tabular">{row.instances}</span>, sortValue: (row) => row.instances, align: "right" },
    {
      id: "requests",
      header: "Requisições 30d",
      cell: (row) => <span className="tabular">{formatCompact(row.requests30d)}</span>,
      sortValue: (row) => row.requests30d,
      align: "right",
    },
    {
      id: "errorRate",
      header: "Taxa de erros",
      cell: (row) => (
        <span className={row.errorRate > 1 ? "tabular text-warn" : "tabular"}>
          {formatPercent(row.errorRate)}
        </span>
      ),
      sortValue: (row) => row.errorRate,
      align: "right",
    },
    { id: "p95", header: "p95", cell: (row) => <span className="tabular">{formatMs(row.p95Ms)}</span>, sortValue: (row) => row.p95Ms, align: "right" },
    {
      id: "license",
      header: "Licença",
      cell: (row) => <StatusBadge status={row.licenseStatus} />,
      sortValue: (row) => row.licenseStatus,
    },
    {
      id: "certificate",
      header: "Certificado",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Visto por último",
      cell: (row) => <span className="text-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
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
        title="Aplicações SaaS"
        description="Todas as aplicações registradas como consumidoras da API. Selecione uma linha para inspecionar credenciais, cotas, instâncias e histórico de auditoria."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registradas" value={rows.length} isLoading={applications.isLoading} />
        <MetricCard
          label="Ativas"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={applications.isLoading}
        />
        <MetricCard
          label="Atenção de licença"
          value={rows.filter((r) => r.licenseStatus !== "active").length}
          tone="warn"
          hint="Carência, expirada, suspensa ou revogada"
          isLoading={applications.isLoading}
        />
        <MetricCard
          label="Atenção de certificado"
          value={rows.filter((r) => r.certificateStatus !== "active").length}
          tone="warn"
          hint="Material mTLS a expirar ou revogado"
          isLoading={applications.isLoading}
        />
      </div>

      <DataTable
        data={applications.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={applications.isLoading}
        error={applications.error ?? undefined}
        searchPlaceholder="Pesquisar aplicações, códigos…"
        onRowClick={(row) => {
          void navigate({ to: `/saas/applications/${row.id}` as never });
        }}
      />
    </div>
  );
}
