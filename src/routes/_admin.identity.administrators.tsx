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
      { title: "Administradores — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Operadores humanos com acesso ao CB67 Labs Control Center, sua função atribuída, contagem de sessões e último login.",
      },
      { property: "og:title", content: "Administradores — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Contas de operadores, funções e atividade de login.",
      },
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
      header: "Administrador",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "role",
      header: "Função",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.role}</code>,
      sortValue: (row) => row.role,
    },
    {
      id: "sessions",
      header: "Sessões ativas",
      cell: (row) => <span className="tabular">{row.sessions}</span>,
      sortValue: (row) => row.sessions,
      align: "right",
    },
    {
      id: "lastLogin",
      header: "Último login",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastLoginAt)}</span>
      ),
      sortValue: (row) => row.lastLoginAt,
      align: "right",
    },
    {
      id: "created",
      header: "Criado",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatDate(row.createdAt)}</span>
      ),
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
            Revogar sessões
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Administradores"
        description="As identidades de operadores são federadas pela plataforma; esta superfície nunca armazena ou exibe credenciais. A autorização deriva inteiramente da função atribuída."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Administradores"
          value={rows.length}
          isLoading={administrators.isLoading}
        />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={administrators.isLoading}
        />
        <MetricCard
          label="Suspensos"
          value={rows.filter((row) => row.status === "suspended").length}
          tone="warn"
          isLoading={administrators.isLoading}
        />
        <MetricCard
          label="Sessões abertas"
          value={rows.reduce((sum, row) => sum + row.sessions, 0)}
          isLoading={administrators.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Contas de operadores"
          description="As funções são gerenciadas em Identidade → Funções."
        />
        <DataTable
          data={administrators.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={administrators.isLoading}
          error={administrators.error ?? undefined}
          searchPlaceholder="Pesquisar administrador ou função…"
          searchValue={(row) => `${row.name} ${row.role}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Revogar todas as sessões"
        warning="Toda sessão ativa deste administrador é encerrada imediatamente. Ele deverá se autenticar novamente, incluindo quaisquer abas do console abertas."
        details={
          target
            ? [
                { label: "Administrador", value: target.name },
                { label: "Função", value: target.role },
                { label: "Sessões", value: `${target.sessions}` },
              ]
            : undefined
        }
        confirmLabel="Revogar sessões"
        environmentNotice="O encerramento de sessão é executado e auditado no servidor."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({
            action: "administrator.revoke-sessions",
            resourceId: target.id,
          });
          setTarget(null);
        }}
      />
    </div>
  );
}
