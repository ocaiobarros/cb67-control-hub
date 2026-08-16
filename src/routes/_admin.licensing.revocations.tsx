import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Revocation } from "@/types";

export const Route = createFileRoute("/_admin/licensing/revocations")({
  head: () => ({
    meta: [
      { title: "Revogações — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registro de revogações cobrindo licenças, instalações, clientes de máquina e certificados, com motivo e responsável.",
      },
      { property: "og:title", content: "Revogações — CB67 Labs Control Center" },
      { property: "og:description", content: "Revogações irreversíveis com motivo e responsável." },
    ],
  }),
  component: RevocationsPage,
});

const TYPE_LABEL: Record<Revocation["type"], string> = {
  license: "Licença",
  installation: "Instalação",
  client: "Cliente de máquina",
  certificate: "Certificado",
};

function RevocationsPage() {
  const revocations = useQuery(q.revocations());
  const rows = revocations.data ?? [];

  const byType = (Object.keys(TYPE_LABEL) as Revocation["type"][]).map((type) => ({
    t: TYPE_LABEL[type],
    value: rows.filter((row) => row.type === type).length,
  }));

  const columns: Column<Revocation>[] = [
    {
      id: "object",
      header: "Objeto",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.object}</code>
          <p className="text-xs text-muted-foreground">{TYPE_LABEL[row.type]}</p>
        </div>
      ),
      sortValue: (row) => row.object,
    },
    {
      id: "reason",
      header: "Motivo",
      cell: (row) => <p className="max-w-md text-sm">{row.reason}</p>,
      sortValue: (row) => row.reason,
    },
    {
      id: "actor",
      header: "Responsável",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.actor}</span>,
      sortValue: (row) => row.actor,
    },
    {
      id: "createdAt",
      header: "Registrado",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.createdAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.createdAt)}</p>
        </div>
      ),
      sortValue: (row) => row.createdAt,
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
        title="Revogações"
        description="O registro de revogações é apenas de anexação. As entradas são publicadas nos pontos de distribuição consultados por instalações e consumidores mTLS."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Entradas" value={rows.length} isLoading={revocations.isLoading} />
        <MetricCard
          label="Licenças"
          value={rows.filter((row) => row.type === "license").length}
          isLoading={revocations.isLoading}
        />
        <MetricCard
          label="Certificados"
          value={rows.filter((row) => row.type === "certificate").length}
          isLoading={revocations.isLoading}
        />
        <MetricCard
          label="Clientes de máquina"
          value={rows.filter((row) => row.type === "client").length}
          isLoading={revocations.isLoading}
        />
      </div>

      <ChartPanel
        title="Revogações por tipo de objeto"
        description="Composição do registro no conjunto de dados atual."
        isLoading={revocations.isLoading}
        error={revocations.error ?? undefined}
        isEmpty={byType.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={byType} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Registro de revogações"
          description="Toda entrada é irreversível e espelhada na trilha de auditoria."
        />
        <DataTable
          data={revocations.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={revocations.isLoading}
          error={revocations.error ?? undefined}
          searchPlaceholder="Pesquisar objeto, motivo ou responsável…"
          searchValue={(row) => `${row.object} ${row.reason} ${row.actor}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
