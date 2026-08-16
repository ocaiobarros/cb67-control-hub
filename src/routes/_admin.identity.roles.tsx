import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import type { Role } from "@/types";

export const Route = createFileRoute("/_admin/identity/roles")({
  head: () => ({
    meta: [
      { title: "Funções — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Funções administrativas, as permissões que cada uma concede e quantos operadores estão atribuídos a elas.",
      },
      { property: "og:title", content: "Funções — CB67 Labs Control Center" },
      { property: "og:description", content: "Definições de funções e permissões concedidas." },
    ],
  }),
  component: RolesPage,
});

function RolesPage() {
  const roles = useQuery(q.roles());
  const rows = roles.data ?? [];

  const columns: Column<Role>[] = [
    {
      id: "name",
      header: "Função",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "description",
      header: "Finalidade",
      cell: (row) => <p className="max-w-md text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "administrators",
      header: "Atribuídos",
      cell: (row) => <span className="tabular">{row.administrators}</span>,
      sortValue: (row) => row.administrators,
      align: "right",
    },
    {
      id: "permissions",
      header: "Permissões",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.permissions.map((permission) => (
            <code key={permission} className="mono-xs rounded border border-border px-1 py-0.5">
              {permission}
            </code>
          ))}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funções"
        description="As funções são o único mecanismo que concede capacidade administrativa. As permissões são aditivas e avaliadas no servidor a cada requisição."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Funções" value={rows.length} isLoading={roles.isLoading} />
        <MetricCard
          label="Operadores atribuídos"
          value={rows.reduce((sum, row) => sum + row.administrators, 0)}
          isLoading={roles.isLoading}
        />
        <MetricCard
          label="Permissões distintas"
          value={new Set(rows.flatMap((row) => row.permissions)).size}
          isLoading={roles.isLoading}
        />
        <MetricCard
          label="Função mais abrangente"
          value={[...rows].sort((a, b) => b.permissions.length - a.permissions.length)[0]?.name ?? "—"}
          isLoading={roles.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Catálogo de funções"
          description="Use a matriz de permissões para comparar a cobertura entre funções."
        />
        <DataTable
          data={roles.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={roles.isLoading}
          error={roles.error ?? undefined}
          searchPlaceholder="Buscar função ou permissão…"
          searchValue={(row) => `${row.name} ${row.code} ${row.permissions.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
