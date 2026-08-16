import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/utils/format";
import type { LicenseProduct } from "@/types";

export const Route = createFileRoute("/_admin/licensing/products")({
  head: () => ({
    meta: [
      { title: "Produtos Licenciados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registro de produtos licenciados da CB67 Labs com versões suportadas, planos disponíveis e contagem de licenças ativas.",
      },
      { property: "og:title", content: "Produtos Licenciados — CB67 Labs Control Center" },
      { property: "og:description", content: "Versões, planos e licenças ativas por produto." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const products = useQuery(q.products());
  const rows = products.data ?? [];

  const columns: Column<LicenseProduct>[] = [
    {
      id: "name",
      header: "Produto",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "versions",
      header: "Versões suportadas",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.versions.map((version) => (
            <code key={version} className="mono-xs rounded border border-border px-1 py-0.5">
              {version}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "plans",
      header: "Planos",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.plans.join(" · ")}</span>,
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
        title="Produtos Licenciados"
        description="Um produto define a unidade licenciável: suas versões suportadas, os planos sob os quais pode ser vendido e os recursos que esses planos desbloqueiam."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Produtos" value={rows.length} isLoading={products.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={products.isLoading}
        />
        <MetricCard
          label="Licenças emitidas"
          value={formatNumber(rows.reduce((sum, row) => sum + row.activeLicenses, 0))}
          isLoading={products.isLoading}
        />
        <MetricCard
          label="Versões distintas"
          value={new Set(rows.flatMap((row) => row.versions)).size}
          isLoading={products.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Registro de produtos"
          description="O suporte a versões orienta a compatibilidade da concessão."
        />
        <DataTable
          data={products.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={products.isLoading}
          error={products.error ?? undefined}
          searchPlaceholder="Pesquisar produto ou código…"
          searchValue={(row) => `${row.name} ${row.code}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
