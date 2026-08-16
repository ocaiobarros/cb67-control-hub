import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Check, Minus } from "lucide-react";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import type { Permission } from "@/types";

export const Route = createFileRoute("/_admin/identity/permissions")({
  head: () => ({
    meta: [
      { title: "Permissões — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Matriz de permissões mostrando quais funções administrativas concedem cada capacidade no CB67 Labs Control Center.",
      },
      { property: "og:title", content: "Permissões — CB67 Labs Control Center" },
      { property: "og:description", content: "Matriz de capacidades por função administrativa." },
    ],
  }),
  component: PermissionsPage,
});

function PermissionsPage() {
  const permissions = useQuery(q.permissions());
  const rows = permissions.data ?? [];
  const roleCodes = [...new Set(rows.flatMap((row) => Object.keys(row.roles)))].sort();

  const columns: Column<Permission>[] = [
    {
      id: "permission",
      header: "Permissão",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.code}</code>
          <p className="text-xs text-muted-foreground">{row.label}</p>
        </div>
      ),
      sortValue: (row) => row.code,
    },
    ...roleCodes.map<Column<Permission>>((role) => ({
      id: role,
      header: role,
      cell: (row) =>
        row.roles[role] ? (
          <Check className="mx-auto size-4 text-ok" aria-label={`${role} concedida`} />
        ) : (
          <Minus
            className="mx-auto size-4 text-muted-foreground"
            aria-label={`${role} não concedida`}
          />
        ),
      sortValue: (row) => (row.roles[role] ? 1 : 0),
      align: "right",
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissões"
        description="Esta matriz documenta o modelo de autorização. A interface oculta ações que um operador não pode executar, mas o backend continua sendo o único ponto de aplicação."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Permissões" value={rows.length} isLoading={permissions.isLoading} />
        <MetricCard
          label="Funções comparadas"
          value={roleCodes.length}
          isLoading={permissions.isLoading}
        />
        <MetricCard
          label="Capacidades de escrita"
          value={rows.filter((row) => row.code.includes(":write")).length}
          tone="warn"
          isLoading={permissions.isLoading}
        />
        <MetricCard
          label="Capacidades de leitura"
          value={rows.filter((row) => row.code.includes(":read")).length}
          isLoading={permissions.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Matriz de permissões"
          description="Uma marca indica que a função concede a capacidade; um traço indica que ela é negada."
        />
        <DataTable
          data={permissions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={permissions.isLoading}
          error={permissions.error ?? undefined}
          searchPlaceholder="Pesquisar permissão…"
          searchValue={(row) => `${row.code} ${row.label}`}
          pageSize={25}
          dense
        />
      </div>
    </div>
  );
}
