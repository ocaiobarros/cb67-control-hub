import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { statusLabel } from "@/i18n/status";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Alert } from "@/types";

export const Route = createFileRoute("/_admin/observability/alerts")({
  head: () => ({
    meta: [
      { title: "Alertas — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Inventário de alertas com severidade, regra de origem, duração do disparo e controles de reconhecimento para operadores da plataforma.",
      },
      { property: "og:title", content: "Alertas — CB67 Labs Control Center" },
      { property: "og:description", content: "Alertas da plataforma disparando, reconhecidos e resolvidos." },
    ],
  }),
  component: AlertsPage,
});

function AlertsPage() {
  const alerts = useQuery(q.alerts());
  const action = useAdminAction();
  const [target, setTarget] = useState<Alert | null>(null);
  const rows = alerts.data ?? [];

  const bySeverity = ["critical", "high", "medium", "low", "info"].map((severity) => ({
    t: severity,
    value: rows.filter((row) => row.severity === severity).length,
  }));

  const columns: Column<Alert>[] = [
    {
      id: "name",
      header: "Alerta",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.source}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "severity",
      header: "Severidade",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
    },
    {
      id: "started",
      header: "Início",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.startedAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.startedAt)}</p>
        </div>
      ),
      sortValue: (row) => row.startedAt,
      align: "right",
    },
    {
      id: "duration",
      header: "Duração",
      cell: (row) => <span className="tabular">{row.duration}</span>,
      align: "right",
    },
    {
      id: "state",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.state} />,
      sortValue: (row) => row.state,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) =>
        row.state === "firing" ? (
          <Permitted permission="observability:write">
            <Button
              variant="outline"
              size="sm"
              onClick={(event) => {
                event.stopPropagation();
                setTarget(row);
              }}
            >
              Reconhecer
            </Button>
          </Permitted>
        ) : null,
      align: "right",
    },
  ];

  const firing = rows.filter((row) => row.state === "firing");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alertas"
        description="Os alertas são avaliados pela stack de observabilidade. Reconhecer um alerta silencia as notificações sem resolver a condição subjacente."
        meta={<StatusBadge status={firing.length > 0 ? "firing" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Disparando"
          value={firing.length}
          tone={firing.length > 0 ? "crit" : "ok"}
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Reconhecidos"
          value={rows.filter((row) => row.state === "acknowledged").length}
          tone="warn"
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Resolvidos"
          value={rows.filter((row) => row.state === "resolved").length}
          tone="ok"
          isLoading={alerts.isLoading}
        />
        <MetricCard
          label="Fontes distintas"
          value={new Set(rows.map((row) => row.source)).size}
          isLoading={alerts.isLoading}
        />
      </div>

      <ChartPanel
        title="Alertas por severidade"
        description="Composição do inventário de alertas atual."
        isLoading={alerts.isLoading}
        error={alerts.error ?? undefined}
        isEmpty={bySeverity.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={bySeverity} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Inventário de alertas" description="Ordenado por severidade ou horário de início." />
        <DataTable
          data={alerts.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={alerts.isLoading}
          error={alerts.error ?? undefined}
          searchPlaceholder="Buscar alerta ou fonte…"
          searchValue={(row) => `${row.name} ${row.source}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Reconhecer alerta"
        warning="As notificações deste alerta ficam silenciadas até que ele seja resolvido e dispare novamente. A condição subjacente permanece inalterada."
        details={
          target
            ? [
                { label: "Alerta", value: target.name },
                { label: "Severidade", value: statusLabel(target.severity ?? "") },
                { label: "Disparando há", value: target.duration },
              ]
            : undefined
        }
        confirmLabel="Reconhecer"
        destructive={false}
        environmentNotice="O reconhecimento é registrado com a identidade do operador na trilha de auditoria."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "alert.acknowledge", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
