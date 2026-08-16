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
      { title: "Escopos OAuth — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Catálogo de escopos de API, a capacidade que cada um autoriza e quantos clientes de máquina o possuem.",
      },
      { property: "og:title", content: "Escopos OAuth — CB67 Labs Control Center" },
      { property: "og:description", content: "Definições de escopos agrupadas por domínio de API." },
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
      header: "Escopo",
      cell: (row) => <code className="mono-xs text-foreground">{row.scope}</code>,
      sortValue: (row) => row.scope,
    },
    {
      id: "description",
      header: "Autoriza",
      cell: (row) => <p className="max-w-lg text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "clients",
      header: "Clientes que possuem",
      cell: (row) => <span className="tabular">{usage[row.scope] ?? 0}</span>,
      sortValue: (row) => usage[row.scope] ?? 0,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Escopos OAuth"
        description="Escopos são o contrato de menor privilégio entre um cliente de máquina e a API. Uma requisição sem o escopo exigido é rejeitada antes de alcançar a lógica de negócio."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Escopos" value={rows.length} isLoading={scopes.isLoading} />
        <MetricCard label="Domínios" value={groups.length} isLoading={scopes.isLoading} />
        <MetricCard
          label="Concedido ao menos uma vez"
          value={rows.filter((row) => (usage[row.scope] ?? 0) > 0).length}
          isLoading={clients.isLoading}
        />
        <MetricCard
          label="Não utilizado"
          value={rows.filter((row) => (usage[row.scope] ?? 0) === 0).length}
          tone="warn"
          hint="Candidatos à descontinuação"
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
        <SectionTitle title="Catálogo de escopos" description="Os nomes são identificadores estáveis do contrato de API." />
        {!scopes.isLoading && rows.length === 0 ? (
          <EmptyState message="Nenhum escopo registrado" hint="O catálogo de escopos é publicado pelo backend." />
        ) : (
          <DataTable
            data={scopes.data}
            columns={columns}
            rowKey={(row) => row.scope}
            isLoading={scopes.isLoading}
            error={scopes.error ?? undefined}
            searchPlaceholder="Pesquisar escopo…"
            searchValue={(row) => `${row.scope} ${row.description}`}
            pageSize={20}
            dense
          />
        )}
      </div>
    </div>
  );
}
