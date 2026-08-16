import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell, MaskedSecret } from "@/components/common/copy-button";
import { AppLink } from "@/components/common/app-link";
import { formatRelative } from "@/utils/format";
import type { MachineClient } from "@/types";

export const Route = createFileRoute("/_admin/identity/machine-clients")({
  head: () => ({
    meta: [
      { title: "Clientes de Máquina — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Identidades de API não humanas: credenciais de cliente, escopos concedidos, vinculação mTLS e última autenticação.",
      },
      { property: "og:title", content: "Clientes de Máquina — CB67 Labs Control Center" },
      { property: "og:description", content: "Credenciais de cliente, escopos e postura mTLS." },
    ],
  }),
  component: MachineClientsPage,
});

function MachineClientsPage() {
  const clients = useQuery(q.machineClients());
  const rows = clients.data ?? [];

  const columns: Column<MachineClient>[] = [
    {
      id: "client",
      header: "Cliente",
      cell: (row) => (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">{row.applicationName}</p>
          <IdentifierCell value={row.clientId} label="client id" />
        </div>
      ),
      sortValue: (row) => row.applicationName,
    },
    { id: "secret", header: "Segredo", cell: () => <MaskedSecret /> },
    {
      id: "environment",
      header: "Ambiente",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "scopes",
      header: "Escopos concedidos",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.scopes.map((scope) => (
            <code key={scope} className="mono-xs rounded border border-border px-1 py-0.5">
              {scope}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "lastAuth",
      header: "Visto por último",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen,
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
        title="Clientes de Máquina"
        description="Identidades de máquina se autenticam com credenciais de cliente por meio de TLS mútuo. Os segredos são somente-escrita: nunca são retornados a esta interface após a emissão."
        actions={
          <AppLink to="/identity/scopes" className="text-xs text-primary hover:underline">
            Catálogo de escopos
          </AppLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes" value={rows.length} isLoading={clients.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Suspensos ou revogados"
          value={rows.filter((row) => row.status !== "active").length}
          tone="warn"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Escopos em uso"
          value={new Set(rows.flatMap((row) => row.scopes)).size}
          isLoading={clients.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Registro de clientes"
          description="A rotação de credenciais é realizada a partir do registro do aplicativo proprietário."
        />
        <DataTable
          data={clients.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={clients.isLoading}
          error={clients.error ?? undefined}
          searchPlaceholder="Buscar cliente ou aplicativo…"
          searchValue={(row) => `${row.clientId} ${row.applicationName} ${row.scopes.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
