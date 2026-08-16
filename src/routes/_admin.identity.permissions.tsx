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
      { title: "Permissions — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Permission matrix showing which administrative roles grant each capability across the CB67 Labs Control Center.",
      },
      { property: "og:title", content: "Permissions — CB67 Labs Control Center" },
      { property: "og:description", content: "Capability matrix per administrative role." },
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
      header: "Permission",
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
          <Check className="mx-auto size-4 text-ok" aria-label={`${role} granted`} />
        ) : (
          <Minus className="mx-auto size-4 text-muted-foreground" aria-label={`${role} not granted`} />
        ),
      sortValue: (row) => (row.roles[role] ? 1 : 0),
      align: "right",
    })),
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Permissions"
        description="This matrix documents the authorisation model. The interface hides actions an operator cannot perform, but the backend remains the only enforcement point."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Permissions" value={rows.length} isLoading={permissions.isLoading} />
        <MetricCard label="Roles compared" value={roleCodes.length} isLoading={permissions.isLoading} />
        <MetricCard
          label="Write capabilities"
          value={rows.filter((row) => row.code.includes(":write")).length}
          tone="warn"
          isLoading={permissions.isLoading}
        />
        <MetricCard
          label="Read capabilities"
          value={rows.filter((row) => row.code.includes(":read")).length}
          isLoading={permissions.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Permission matrix"
          description="A tick means the role grants the capability; a dash means it is denied."
        />
        <DataTable
          data={permissions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={permissions.isLoading}
          error={permissions.error ?? undefined}
          searchPlaceholder="Search permission…"
          searchValue={(row) => `${row.code} ${row.label}`}
          pageSize={25}
          dense
        />
      </div>
    </div>
  );
}
