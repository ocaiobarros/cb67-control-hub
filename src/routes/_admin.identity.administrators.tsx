import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatDate, formatRelative } from "@/utils/format";
import type { Administrator } from "@/types";

export const Route = createFileRoute("/_admin/identity/administrators")({
  head: () => ({
    meta: [
      { title: "Administrators — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Human operators with access to the CB67 Labs Control Center, their assigned role, session count and last sign-in.",
      },
      { property: "og:title", content: "Administrators — CB67 Labs Control Center" },
      { property: "og:description", content: "Operator accounts, roles and sign-in activity." },
    ],
  }),
  component: AdministratorsPage,
});

function AdministratorsPage() {
  const administrators = useQuery(q.administrators());
  const action = useAdminAction();
  const [target, setTarget] = useState<Administrator | null>(null);
  const rows = administrators.data ?? [];

  const columns: Column<Administrator>[] = [
    {
      id: "name",
      header: "Administrator",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "role",
      header: "Role",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.role}</code>,
      sortValue: (row) => row.role,
    },
    {
      id: "sessions",
      header: "Active sessions",
      cell: (row) => <span className="tabular">{row.sessions}</span>,
      sortValue: (row) => row.sessions,
      align: "right",
    },
    {
      id: "lastLogin",
      header: "Last sign-in",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.lastLoginAt)}</span>,
      sortValue: (row) => row.lastLoginAt,
      align: "right",
    },
    {
      id: "created",
      header: "Created",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
      sortValue: (row) => row.createdAt,
      align: "right",
      hideByDefault: true,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="identity:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Revoke sessions
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrators"
        description="Operator identities are federated by the platform; this surface never stores or displays credentials. Authorisation derives entirely from the assigned role."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Administrators" value={rows.length} isLoading={administrators.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={administrators.isLoading}
        />
        <MetricCard
          label="Suspended"
          value={rows.filter((row) => row.status === "suspended").length}
          tone="warn"
          isLoading={administrators.isLoading}
        />
        <MetricCard
          label="Open sessions"
          value={rows.reduce((sum, row) => sum + row.sessions, 0)}
          isLoading={administrators.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Operator accounts" description="Roles are managed under Identity → Roles." />
        <DataTable
          data={administrators.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={administrators.isLoading}
          error={administrators.error ?? undefined}
          searchPlaceholder="Search administrator or role…"
          searchValue={(row) => `${row.name} ${row.role}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Revoke all sessions"
        warning="Every active session for this administrator is terminated immediately. They must authenticate again, including any open console tabs."
        details={
          target
            ? [
                { label: "Administrator", value: target.name },
                { label: "Role", value: target.role },
                { label: "Sessions", value: `${target.sessions}` },
              ]
            : undefined
        }
        confirmLabel="Revoke sessions"
        environmentNotice="Session termination is executed and audited server-side."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "administrator.revoke-sessions", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
