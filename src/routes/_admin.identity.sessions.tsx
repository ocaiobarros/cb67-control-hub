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
import { formatDateTime, formatRelative } from "@/utils/format";
import type { AdminSession } from "@/types";

export const Route = createFileRoute("/_admin/identity/sessions")({
  head: () => ({
    meta: [
      { title: "Administrative Sessions — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Open Control Center sessions with originating device, source address, activity and expiry, plus termination controls.",
      },
      { property: "og:title", content: "Administrative Sessions — CB67 Labs Control Center" },
      { property: "og:description", content: "Live operator sessions and termination controls." },
    ],
  }),
  component: SessionsPage,
});

function SessionsPage() {
  const sessions = useQuery(q.sessions());
  const action = useAdminAction();
  const [target, setTarget] = useState<AdminSession | null>(null);
  const rows = sessions.data ?? [];

  const columns: Column<AdminSession>[] = [
    {
      id: "administrator",
      header: "Administrator",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.administrator}</p>
          <p className="text-xs text-muted-foreground">{row.device}</p>
        </div>
      ),
      sortValue: (row) => row.administrator,
    },
    {
      id: "source",
      header: "Source",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      sortValue: (row) => row.source,
    },
    {
      id: "created",
      header: "Started",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.createdAt)}</span>,
      sortValue: (row) => row.createdAt,
      align: "right",
    },
    {
      id: "activity",
      header: "Last activity",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastActivityAt)}</span>
      ),
      sortValue: (row) => row.lastActivityAt,
      align: "right",
    },
    {
      id: "expires",
      header: "Expires",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
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
            Terminate
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administrative Sessions"
        description="Sessions are short-lived and bound to the originating device fingerprint. Terminating a session is immediate and forces re-authentication."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sessions" value={rows.length} isLoading={sessions.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Distinct operators"
          value={new Set(rows.map((row) => row.administrator)).size}
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Distinct sources"
          value={new Set(rows.map((row) => row.source)).size}
          hint="Originating network addresses"
          isLoading={sessions.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Open sessions" description="Sorted by last activity when that column is selected." />
        <DataTable
          data={sessions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={sessions.isLoading}
          error={sessions.error ?? undefined}
          searchPlaceholder="Search administrator, device or source…"
          searchValue={(row) => `${row.administrator} ${row.device} ${row.source}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Terminate session"
        warning="The session is invalidated immediately. Any unsaved work in that browser tab is lost and the operator must sign in again."
        details={
          target
            ? [
                { label: "Administrator", value: target.administrator },
                { label: "Device", value: target.device },
                { label: "Source", value: target.source },
              ]
            : undefined
        }
        confirmLabel="Terminate session"
        environmentNotice="Termination is executed and audited server-side."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "session.terminate", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
