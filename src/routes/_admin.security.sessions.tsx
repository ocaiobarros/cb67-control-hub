import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { AdminSession } from "@/types";

export const Route = createFileRoute("/_admin/security/sessions")({
  head: () => ({
    meta: [
      { title: "Segurança de Sessões — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Postura de segurança de sessões: concorrência por operador, origens, impressões digitais de dispositivos e janelas de expiração.",
      },
      { property: "og:title", content: "Segurança de Sessões — CB67 Labs Control Center" },
      { property: "og:description", content: "Concorrência de sessões, origens e postura de expiração." },
    ],
  }),
  component: SecuritySessionsPage,
});

function SecuritySessionsPage() {
  const sessions = useQuery(q.sessions());
  const rows = sessions.data ?? [];

  const byOperator = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.administrator] = (acc[row.administrator] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value);

  const concurrent = byOperator.filter((entry) => entry.value > 1);

  const columns: Column<AdminSession>[] = [
    {
      id: "administrator",
      header: "Operador",
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segurança de Sessões"
        description="As sessões estão vinculadas a uma impressão digital do dispositivo e expiram em uma janela fixa. Os controles de encerramento estão em Identidade → Sessões."
        actions={
          <AppLink to="/identity/sessions" className="text-xs text-primary hover:underline">
            Gerenciar sessões
          </AppLink>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Sessões abertas" value={rows.length} isLoading={sessions.isLoading} />
        <MetricCard
          label="Operadores online"
          value={byOperator.length}
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Operadores concorrentes"
          value={concurrent.length}
          tone={concurrent.length > 0 ? "warn" : "ok"}
          hint="Mais de uma sessão ativa"
          isLoading={sessions.isLoading}
        />
        <MetricCard
          label="Origens distintas"
          value={new Set(rows.map((row) => row.source)).size}
          isLoading={sessions.isLoading}
        />
      </div>

      <ChartPanel
        title="Sessões por operador"
        description="Concorrência inesperada pode indicar uma conta compartilhada ou uma sessão roubada."
        isLoading={sessions.isLoading}
        error={sessions.error ?? undefined}
        isEmpty={byOperator.length === 0}
      >
        <CategoryBarChart data={byOperator} layout="horizontal" />
      </ChartPanel>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Política de sessão</h3>
        <dl className="mt-2">
          <StatRow label="Vinculação" value="Impressão digital do dispositivo mais endereço de origem" />
          <StatRow label="Expiração" value="Janela fixa, sem extensão silenciosa" />
          <StatRow label="Armazenamento" value="Registros de sessão no servidor; sem tokens de navegador de longa duração" />
          <StatRow label="Encerramento" value="Imediato, a partir de Identidade → Sessões" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Sessões ativas" description="Visualização somente leitura do inventário de sessões atual." />
        <DataTable
          data={sessions.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={sessions.isLoading}
          error={sessions.error ?? undefined}
          searchPlaceholder="Pesquisar operador, dispositivo ou origem…"
          searchValue={(row) => `${row.administrator} ${row.device} ${row.source}`}
          pageSize={15}
          dense
        />
      </div>
    </div>
  );
}
