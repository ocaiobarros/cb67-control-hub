import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { IdentifierCell } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { formatRelative, formatRelativeOrNull } from "@/utils/format";
import type { MachineClient } from "@/types";

export const Route = createFileRoute("/_admin/saas/clients")({
  head: () => ({
    meta: [
      { title: "Clientes de Máquina — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Clientes máquina a máquina autorizados na plataforma CB67 Labs, com escopos concedidos e estado de certificado.",
      },
      { property: "og:title", content: "Clientes de Máquina — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Clientes M2M, escopos concedidos e estado de certificado.",
      },
    ],
  }),
  component: ClientsPage,
});

function ClientsPage() {
  const clients = useQuery(q.machineClients());
  const scopes = useQuery(q.scopeDefinitions());
  const rows = clients.data ?? [];

  const columns: Column<MachineClient>[] = [
    {
      id: "clientId",
      header: "ID do cliente",
      cell: (row) => <IdentifierCell value={row.clientId} label="client id" />,
      sortValue: (row) => row.clientId,
    },
    {
      id: "applicationName",
      header: "Aplicação",
      cell: (row) => <span className="text-sm font-medium">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
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
    {
      id: "scopes",
      header: "Escopos",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.scopes.slice(0, 3).map((scope) => (
            <Badge key={scope} variant="secondary" className="mono-xs">
              {scope}
            </Badge>
          ))}
          {row.scopes.length > 3 && (
            <span className="text-xs text-muted-foreground">+{row.scopes.length - 3}</span>
          )}
        </div>
      ),
    },
    {
      id: "certificateStatus",
      header: "Certificado",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
    },
    {
      id: "lastSeen",
      header: "Último uso",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatRelativeOrNull(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen ?? "",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  const grouped = new Map<string, typeof scopes.data>();
  for (const definition of scopes.data ?? []) {
    const list = grouped.get(definition.group) ?? [];
    grouped.set(definition.group, [...(list ?? []), definition]);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clientes de Máquina"
        description="Identidades client-credential usadas por serviços. Cada cliente está vinculado a uma aplicação e restrito por escopos explícitos."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Clientes" value={rows.length} isLoading={clients.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Revogados ou a expirar"
          value={rows.filter((r) => r.certificateStatus !== "active").length}
          tone="warn"
          isLoading={clients.isLoading}
        />
      </div>

      <DataTable
        data={clients.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={clients.isLoading}
        error={clients.error ?? undefined}
        searchPlaceholder="Pesquisar clientes, aplicações…"
      />

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Catálogo de escopos</h2>
        <p className="pb-3 text-xs text-muted-foreground">
          Nomes canônicos de escopo aceitos pela camada de autorização da plataforma.
        </p>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...grouped.entries()].map(([group, definitions]) => (
            <div key={group}>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {group}
              </p>
              <ul className="mt-1.5 space-y-1.5">
                {(definitions ?? []).map((definition) => (
                  <li key={definition.scope} className="text-xs">
                    <code className="mono-xs text-foreground">{definition.scope}</code>
                    <span className="text-muted-foreground"> — {definition.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
