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
      { title: "Licensed Products — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registry of licensed CB67 Labs products with supported versions, available plans and active licence counts.",
      },
      { property: "og:title", content: "Licensed Products — CB67 Labs Control Center" },
      { property: "og:description", content: "Versions, plans and active licences per product." },
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
      header: "Product",
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
      header: "Supported versions",
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
      header: "Plans",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.plans.join(" · ")}</span>
      ),
    },
    {
      id: "active",
      header: "Active licences",
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
        title="Licensed Products"
        description="A product defines the licensable unit: its supported versions, the plans it can be sold under and the features those plans unlock."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Products" value={rows.length} isLoading={products.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={products.isLoading}
        />
        <MetricCard
          label="Licences issued"
          value={formatNumber(rows.reduce((sum, row) => sum + row.activeLicenses, 0))}
          isLoading={products.isLoading}
        />
        <MetricCard
          label="Distinct versions"
          value={new Set(rows.flatMap((row) => row.versions)).size}
          isLoading={products.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Product registry" description="Version support drives lease compatibility." />
        <DataTable
          data={products.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={products.isLoading}
          error={products.error ?? undefined}
          searchPlaceholder="Search product or code…"
          searchValue={(row) => `${row.name} ${row.code}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
