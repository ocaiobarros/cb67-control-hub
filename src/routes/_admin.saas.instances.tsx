import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { IdentifierCell } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/utils/format";
import type { Instance } from "@/types";

export const Route = createFileRoute("/_admin/saas/instances")({
  head: () => ({
    meta: [
      { title: "Instâncias SaaS — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Todas as instâncias implantadas reportando à plataforma CB67 Labs, com identidade de instalação, desvio de versão e postura de certificado.",
      },
      { property: "og:title", content: "Instâncias SaaS — CB67 Labs Control Center" },
      { property: "og:description", content: "Identidade de instalação, desvio de versão e heartbeat." },
    ],
  }),
  component: InstancesPage,
});

function InstancesPage() {
  const instances = useQuery(q.instances());
  const rows = instances.data ?? [];
  const versions = new Set(rows.map((row) => row.version));

  const columns: Column<Instance>[] = [
    {
      id: "installationId",
      header: "Instalação",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    { id: "hostLabel", header: "Host", cell: (row) => <span className="text-sm">{row.hostLabel}</span>, sortValue: (row) => row.hostLabel },
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
    { id: "version", header: "Versão", cell: (row) => <span className="mono-xs">{row.version}</span>, sortValue: (row) => row.version },
    {
      id: "licenseId",
      header: "Licença",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.licenseId}</span>,
      hideByDefault: true,
    },
    {
      id: "certificateStatus",
      header: "Certificado",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
    },
    {
      id: "lastSeen",
      header: "Heartbeat",
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
        title="Instâncias SaaS"
        description="As instâncias são identificadas pelo ID de instalação e autenticam via mTLS. Heartbeats ausentes ou desvio de versão geralmente precedem incidentes de licenciamento."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reportando" value={rows.length} isLoading={instances.isLoading} />
        <MetricCard
          label="Ativas"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={instances.isLoading}
        />
        <MetricCard
          label="Versões distintas"
          value={versions.size}
          tone={versions.size > 3 ? "warn" : "neutral"}
          hint="Desvio de versão na frota"
          isLoading={instances.isLoading}
        />
        <MetricCard
          label="Atenção de certificado"
          value={rows.filter((r) => r.certificateStatus !== "active").length}
          tone="warn"
          isLoading={instances.isLoading}
        />
      </div>

      <DataTable
        data={instances.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={instances.isLoading}
        error={instances.error ?? undefined}
        searchPlaceholder="Pesquisar instalações, hosts…"
        pageSize={15}
      />
    </div>
  );
}
