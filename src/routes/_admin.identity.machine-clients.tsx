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
      { title: "Machine Clients — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Non-human API identities: client credentials, granted scopes, mTLS binding and last authentication.",
      },
      { property: "og:title", content: "Machine Clients — CB67 Labs Control Center" },
      { property: "og:description", content: "Client credentials, scopes and mTLS posture." },
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
      header: "Client",
      cell: (row) => (
        <div className="min-w-0 space-y-0.5">
          <p className="truncate text-sm font-medium">{row.applicationName}</p>
          <IdentifierCell value={row.clientId} label="client id" />
        </div>
      ),
      sortValue: (row) => row.applicationName,
    },
    { id: "secret", header: "Secret", cell: () => <MaskedSecret /> },
    {
      id: "environment",
      header: "Environment",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "scopes",
      header: "Granted scopes",
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
      header: "Last seen",
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
        title="Machine Clients"
        description="Machine identities authenticate with client credentials over mutual TLS. Secrets are write-only: they are never returned to this interface after issuance."
        actions={
          <AppLink to="/identity/scopes" className="text-xs text-primary hover:underline">
            Scope catalogue
          </AppLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clients" value={rows.length} isLoading={clients.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Suspended or revoked"
          value={rows.filter((row) => row.status !== "active").length}
          tone="warn"
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Scopes in use"
          value={new Set(rows.flatMap((row) => row.scopes)).size}
          isLoading={clients.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Client registry"
          description="Credential rotation is performed from the owning application record."
        />
        <DataTable
          data={clients.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={clients.isLoading}
          error={clients.error ?? undefined}
          searchPlaceholder="Search client or application…"
          searchValue={(row) => `${row.clientId} ${row.applicationName} ${row.scopes.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
