import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/utils/format";
import type { LicensePlan } from "@/types";

export const Route = createFileRoute("/_admin/licensing/plans")({
  head: () => ({
    meta: [
      { title: "Planos de Licença — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Planos comerciais com tetos de instalação, recursos incluídos e o número de licenças vendidas em cada camada.",
      },
      { property: "og:title", content: "Planos de Licença — CB67 Labs Control Center" },
      { property: "og:description", content: "Tetos, recursos incluídos e adoção por plano." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const plans = useQuery(q.plans());
  const rows = plans.data ?? [];

  const columns: Column<LicensePlan>[] = [
    {
      id: "name",
      header: "Plano",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "max",
      header: "Teto de instalação",
      cell: (row) => <span className="tabular">{formatNumber(row.maxInstallations)}</span>,
      sortValue: (row) => row.maxInstallations,
      align: "right",
    },
    {
      id: "features",
      header: "Recursos incluídos",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.features.map((feature) => (
            <code key={feature} className="mono-xs rounded border border-border px-1 py-0.5">
              {feature}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "active",
      header: "Licenças ativas",
      cell: (row) => <span className="tabular">{formatNumber(row.activeLicenses)}</span>,
      sortValue: (row) => row.activeLicenses,
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
        title="Planos de Licença"
        description="Os planos expressam o que um cliente pode executar: quantas instalações e quais recursos são concedidos. Preços estão propositalmente fora do escopo desta interface."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Planos" value={rows.length} isLoading={plans.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Licenças no plano"
          value={formatNumber(rows.reduce((sum, row) => sum + row.activeLicenses, 0))}
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Recursos distintos"
          value={new Set(rows.flatMap((row) => row.features)).size}
          isLoading={plans.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Catálogo de planos"
          description="Os pacotes de recursos são resolvidos na emissão da concessão."
        />
        <DataTable
          data={plans.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={plans.isLoading}
          error={plans.error ?? undefined}
          searchPlaceholder="Pesquisar plano ou código…"
          searchValue={(row) => `${row.name} ${row.code}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
