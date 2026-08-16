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
      { title: "Sessões Administrativas — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Sessões abertas do Control Center com dispositivo de origem, endereço de origem, atividade e expiração, além de controles de encerramento.",
      },
      { property: "og:title", content: "Sessões Administrativas — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Sessões ativas de operadores e controles de encerramento.",
      },
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
      header: "Administrador",
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
      header: "Origem",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.source}</code>,
      sortValue: (row) => row.source,
    },
    {
      id: "created",
      header: "Iniciada",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.createdAt)}</span>,
      sortValue: (row) => row.createdAt,
      align: "right",
    },
    {
      id: "activity",
      header: "Última atividade",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastActivityAt)}</span>
      ),
      sortValue: (row) => row.lastActivityAt,
      align: "right",
    },
    {
      id: "expires",
      header: "Expira",
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
            Encerrar
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sessões Administrativas"
        description="As sessões têm vida curta e estão vinculadas à impressão digital do dispositivo de origem. Encerrar uma sessão é imediato e força uma nova autenticação."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sessões" value={rows.length} isLoading={sessions.isLoading} />
        <MetricCard
          label="Ativas"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Operadores distintos"
          value={new Set(rows.map((row) => row.administrator)).size}
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Origens distintas"
          value={new Set(rows.map((row) => row.source)).size}
          hint="Endereços de rede de origem"
          isLoading={sessions.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Sessões abertas"
          description="Ordenado por última atividade quando essa coluna é selecionada."
        />
        <DataTable
          data={sessions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={sessions.isLoading}
          error={sessions.error ?? undefined}
          searchPlaceholder="Pesquisar administrador, dispositivo ou origem…"
          searchValue={(row) => `${row.administrator} ${row.device} ${row.source}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Encerrar sessão"
        warning="A sessão é invalidada imediatamente. Qualquer trabalho não salvo naquela aba do navegador é perdido e o operador deve fazer login novamente."
        details={
          target
            ? [
                { label: "Administrador", value: target.administrator },
                { label: "Dispositivo", value: target.device },
                { label: "Origem", value: target.source },
              ]
            : undefined
        }
        confirmLabel="Encerrar sessão"
        environmentNotice="O encerramento é executado e auditado no servidor."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "session.terminate", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
