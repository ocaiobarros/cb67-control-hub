import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { ChartPanel, CategoryBarChart, DonutChart, TimeSeriesChart } from "@/components/charts/chart-panel";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { AppLink } from "@/components/common/app-link";
import { formatCompact, formatDate, daysUntil } from "@/utils/format";
import type { License } from "@/types";

export const Route = createFileRoute("/_admin/licensing/")({
  head: () => ({
    meta: [
      { title: "Visão Geral de Licenciamento — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Saúde do portfólio de licenças: licenças ativas, em carência, suspensas, expiradas e revogadas, com linha do tempo de expiração e tendência de ativações.",
      },
      { property: "og:title", content: "Visão Geral de Licenciamento — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Status do portfólio, distribuição por produto e plano, e próximas expirações.",
      },
    ],
  }),
  component: LicensingOverviewPage,
});

function LicensingOverviewPage() {
  const overview = useQuery(q.licensingOverview());
  const licenses = useQuery(q.licenses());
  const data = overview.data;

  const expiring = [...(licenses.data ?? [])]
    .filter((row) => row.status === "active" || row.status === "grace")
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))
    .slice(0, 8);

  const columns: Column<License>[] = [
    {
      id: "key",
      header: "Licença",
      cell: (row) => (
        <AppLink to={`/licensing/licenses/${row.id}`} className="hover:underline">
          <code className="mono-xs text-foreground">{row.key}</code>
        </AppLink>
      ),
      sortValue: (row) => row.key,
    },
    {
      id: "customer",
      header: "Cliente",
      cell: (row) => <span className="text-sm">{row.customerName}</span>,
      sortValue: (row) => row.customerName,
    },
    {
      id: "product",
      header: "Produto",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.productName}</span>,
      sortValue: (row) => row.productName,
    },
    {
      id: "expires",
      header: "Expira",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <div className="text-right">
            <span className="mono-xs">{formatDate(row.expiresAt)}</span>
            <p className={days <= 15 ? "mono-xs text-crit" : "mono-xs text-muted-foreground"}>
              em {days} dias
            </p>
          </div>
        );
      },
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
        title="Visão Geral de Licenciamento"
        description="O serviço de licenciamento emite concessões assinadas para produtos instalados. A validação ocorre offline em relação a um conjunto de chaves publicado, portanto a revogação se propaga na próxima renovação da concessão."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Ativas" value={data?.active ?? "—"} tone="ok" isLoading={overview.isLoading} />
        <MetricCard label="Carência" value={data?.grace ?? "—"} tone="warn" isLoading={overview.isLoading} />
        <MetricCard label="Suspensas" value={data?.suspended ?? "—"} tone="warn" isLoading={overview.isLoading} />
        <MetricCard label="Expiradas" value={data?.expired ?? "—"} tone="crit" isLoading={overview.isLoading} />
        <MetricCard label="Revogadas" value={data?.revoked ?? "—"} tone="crit" isLoading={overview.isLoading} />
        <MetricCard
          label="Expirando em 30d"
          value={data?.expiringSoon ?? "—"}
          hint="Janela de contato para renovação"
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Licenças por produto"
          description="Distribuição do portfólio entre produtos licenciados."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.byProduct.length ?? 0) === 0}
        >
          <DonutChart data={data?.byProduct ?? []} />
        </ChartPanel>
        <ChartPanel
          title="Licenças por plano"
          description="Mix de camadas comerciais."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.byPlan.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.byPlan ?? []} colorByIndex />
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Linha do tempo de expiração"
          description="Licenças que atingem a data final por período futuro."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.expirationTimeline.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.expirationTimeline ?? []} />
        </ChartPanel>
        <ChartPanel
          title="Ativações"
          description="Novas instalações vinculadas a uma licença."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.activations.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={data?.activations ?? []}
            series={[{ key: "value", label: "Ativações" }]}
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Expirações mais próximas"
          description="Licenças ativas e em carência ordenadas pela validade restante."
          actions={
            <AppLink to="/licensing/licenses" className="text-xs text-primary hover:underline">
              Todas as licenças
            </AppLink>
          }
        />
        <DataTable
          data={expiring}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={licenses.isLoading}
          error={licenses.error ?? undefined}
          dense
        />
      </div>

      <p className="text-xs text-muted-foreground">
        Os totais do portfólio cobrem {formatCompact((licenses.data ?? []).length)} registros de licença no
        conjunto de dados atual.
      </p>
    </div>
  );
}
