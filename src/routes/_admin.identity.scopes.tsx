import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { EmptyState } from "@/components/common/empty-state";
import type { ScopeDefinition } from "@/types";

export const Route = createFileRoute("/_admin/identity/scopes")({
  head: () => ({
    meta: [
      { title: "OAuth Scopes — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Catalogue of API scopes, the capability each one authorises and how many machine clients hold it.",
      },
      { property: "og:title", content: "OAuth Scopes — CB67 Labs Control Center" },
      { property: "og:description", content: "Scope definitions grouped by API domain." },
    ],
  }),
  component: ScopesPage,
});

function ScopesPage() {
  const scopes = useQuery(q.scopeDefinitions());
  const clients = useQuery(q.machineClients());
  const rows = scopes.data ?? [];

  const usage = (clients.data ?? []).reduce<Record<string, number>>((acc, client) => {
    for (const scope of client.scopes) acc[scope] = (acc[scope] ?? 0) + 1;
    return acc;
  }, {});

  const groups = [...new Set(rows.map((row) => row.scope.split(":")[0] ?? "other"))].sort();

  const columns: Column<ScopeDefinition>[] = [
    {
      id: "scope",
      header: "Scope",
      cell: (row) => <code className="mono-xs text-foreground">{row.scope}</code>,
      sortValue: (row) => row.scope,
    },
    {
      id: "description",
      header: "Authorises",
      cell: (row) => <p className="max-w-lg text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "clients",
      header: "Clients holding",
      cell: (row) => <span className="tabular">{usage[row.scope] ?? 0}</span>,
      sortValue: (row) => usage[row.scope] ?? 0,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="OAuth Scopes"
        description="Scopes are the least-privilege contract between a machine client and the API. A request without the required scope is rejected before reaching business logic."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Scopes" value={rows.length} isLoading={scopes.isLoading} />
        <MetricCard label="Domains" value={groups.length} isLoading={scopes.isLoading} />
        <MetricCard
          label="Granted at least once"
          value={rows.filter((row) => (usage[row.scope] ?? 0) > 0).length}
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Unused"
          value={rows.filter((row) => (usage[row.scope] ?? 0) === 0).length}
          tone="warn"
          hint="Candidates for deprecation"
          isLoading={clients.isLoading}
        />
      </div>

      {groups.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {groups.map((group) => (
            <span key={group} className="rounded border border-border px-2 py-0.5 text-xs text-muted-foreground">
              {group} · {rows.filter((row) => row.scope.startsWith(`${group}:`)).length}
            </span>
          ))}
        </div>
      )}

      <div className="space-y-3">
        <SectionTitle title="Scope catalogue" description="Names are stable API contract identifiers." />
        {!scopes.isLoading && rows.length === 0 ? (
          <EmptyState message="No scopes registered" hint="The scope catalogue is published by the backend." />
        ) : (
          <DataTable
            data={scopes.data}
            columns={columns}
            rowKey={(row) => row.scope}
            isLoading={scopes.isLoading}
            error={scopes.error ?? undefined}
            searchPlaceholder="Search scope…"
            searchValue={(row) => `${row.scope} ${row.description}`}
            pageSize={20}
            dense
          />
        )}
      </div>
    </div>
  );
}
