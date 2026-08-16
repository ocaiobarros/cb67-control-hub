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
import type { MachineClient } from "@/types";

export const Route = createFileRoute("/_admin/saas/clients")({
  head: () => ({
    meta: [
      { title: "Machine Clients — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Machine-to-machine clients authorised on the CB67 Labs platform, with granted scopes and certificate state.",
      },
      { property: "og:title", content: "Machine Clients — CB67 Labs Control Center" },
      { property: "og:description", content: "M2M clients, granted scopes and certificate state." },
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
      header: "Client ID",
      cell: (row) => <IdentifierCell value={row.clientId} label="client id" />,
      sortValue: (row) => row.clientId,
    },
    {
      id: "applicationName",
      header: "Application",
      cell: (row) => <span className="text-sm font-medium">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
    },
    {
      id: "environment",
      header: "Env",
      cell: (row) => (
        <Badge variant="outline" className="mono-xs">
          {row.environment}
        </Badge>
      ),
      sortValue: (row) => row.environment,
    },
    {
      id: "scopes",
      header: "Scopes",
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
      header: "Certificate",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
    },
    {
      id: "lastSeen",
      header: "Last used",
      cell: (row) => <span className="text-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
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
        title="Machine Clients"
        description="Client-credential identities used by services. Each client is bound to one application and constrained by explicit scopes."
      />

      <div className="grid gap-3 sm:grid-cols-3">
        <MetricCard label="Clients" value={rows.length} isLoading={clients.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Revoked or expiring"
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
        searchPlaceholder="Search clients, applications…"
      />

      <section className="panel p-4">
        <h2 className="text-sm font-semibold">Scope catalogue</h2>
        <p className="pb-3 text-xs text-muted-foreground">
          Canonical scope names accepted by the platform authorisation layer.
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
