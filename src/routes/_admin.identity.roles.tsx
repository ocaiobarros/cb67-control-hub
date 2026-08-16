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
      { title: "Roles — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Administrative roles, the permissions each one grants and how many operators are assigned to them.",
      },
      { property: "og:title", content: "Roles — CB67 Labs Control Center" },
      { property: "og:description", content: "Role definitions and granted permissions." },
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
      header: "Role",
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
      header: "Purpose",
      cell: (row) => <p className="max-w-md text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "administrators",
      header: "Assigned",
      cell: (row) => <span className="tabular">{row.administrators}</span>,
      sortValue: (row) => row.administrators,
      align: "right",
    },
    {
      id: "permissions",
      header: "Permissions",
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
        title="Roles"
        description="Roles are the only mechanism that grants administrative capability. Permissions are additive and evaluated server-side on every request."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Roles" value={rows.length} isLoading={roles.isLoading} />
        <MetricCard
          label="Operators assigned"
          value={rows.reduce((sum, row) => sum + row.administrators, 0)}
          isLoading={roles.isLoading}
        />
        <MetricCard
          label="Distinct permissions"
          value={new Set(rows.flatMap((row) => row.permissions)).size}
          isLoading={roles.isLoading}
        />
        <MetricCard
          label="Broadest role"
          value={[...rows].sort((a, b) => b.permissions.length - a.permissions.length)[0]?.name ?? "—"}
          isLoading={roles.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Role catalogue"
          description="Use the permission matrix to compare coverage across roles."
        />
        <DataTable
          data={roles.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={roles.isLoading}
          error={roles.error ?? undefined}
          searchPlaceholder="Search role or permission…"
          searchValue={(row) => `${row.name} ${row.code} ${row.permissions.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
