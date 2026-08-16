import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDate, formatNumber } from "@/utils/format";
import type { Customer } from "@/types";

export const Route = createFileRoute("/_admin/licensing/customers")({
  head: () => ({
    meta: [
      { title: "Licence Customers — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Customers holding CB67 Labs licences, with contracted products, licence counts and active installations.",
      },
      { property: "og:title", content: "Licence Customers — CB67 Labs Control Center" },
      { property: "og:description", content: "Contracted products, licences and installations." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const customers = useQuery(q.customers());
  const rows = customers.data ?? [];

  const columns: Column<Customer>[] = [
    {
      id: "name",
      header: "Customer",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "products",
      header: "Products",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.products.map((product) => (
            <span key={product} className="rounded border border-border px-1.5 py-0.5 text-xs">
              {product}
            </span>
          ))}
        </div>
      ),
    },
    {
      id: "licenses",
      header: "Licences",
      cell: (row) => <span className="tabular">{formatNumber(row.licenses)}</span>,
      sortValue: (row) => row.licenses,
      align: "right",
    },
    {
      id: "installations",
      header: "Installations",
      cell: (row) => <span className="tabular">{formatNumber(row.installations)}</span>,
      sortValue: (row) => row.installations,
      align: "right",
    },
    {
      id: "created",
      header: "Customer since",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
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
        title="Licence Customers"
        description="Commercial counterparties of the licensing service. Customer records hold no payment data; billing lives outside the platform."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Customers" value={rows.length} isLoading={customers.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={customers.isLoading}
        />
        <MetricCard
          label="Licences held"
          value={formatNumber(rows.reduce((sum, row) => sum + row.licenses, 0))}
          isLoading={customers.isLoading}
        />
        <MetricCard
          label="Installations"
          value={formatNumber(rows.reduce((sum, row) => sum + row.installations, 0))}
          isLoading={customers.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Customer registry" description="Sorted and filtered in the browser." />
        <DataTable
          data={customers.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={customers.isLoading}
          error={customers.error ?? undefined}
          searchPlaceholder="Search customer or product…"
          searchValue={(row) => `${row.name} ${row.products.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
