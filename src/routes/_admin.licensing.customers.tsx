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
      { title: "Clientes de Licenças — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Clientes com licenças da CB67 Labs, com produtos contratados, contagem de licenças e instalações ativas.",
      },
      { property: "og:title", content: "Clientes de Licenças — CB67 Labs Control Center" },
      { property: "og:description", content: "Produtos contratados, licenças e instalações." },
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
      header: "Cliente",
      cell: (row) => <span className="text-sm font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "products",
      header: "Produtos",
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
      header: "Licenças",
      cell: (row) => <span className="tabular">{formatNumber(row.licenses)}</span>,
      sortValue: (row) => row.licenses,
      align: "right",
    },
    {
      id: "installations",
      header: "Instalações",
      cell: (row) => <span className="tabular">{formatNumber(row.installations)}</span>,
      sortValue: (row) => row.installations,
      align: "right",
    },
    {
      id: "created",
      header: "Cliente desde",
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
        title="Clientes de Licenças"
        description="Contrapartes comerciais do serviço de licenciamento. Os registros de clientes não armazenam dados de pagamento; a cobrança fica fora da plataforma."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Clientes" value={rows.length} isLoading={customers.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={customers.isLoading}
        />
        <MetricCard
          label="Licenças detidas"
          value={formatNumber(rows.reduce((sum, row) => sum + row.licenses, 0))}
          isLoading={customers.isLoading}
        />
        <MetricCard
          label="Instalações"
          value={formatNumber(rows.reduce((sum, row) => sum + row.installations, 0))}
          isLoading={customers.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Registro de clientes" description="Ordenado e filtrado no navegador." />
        <DataTable
          data={customers.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={customers.isLoading}
          error={customers.error ?? undefined}
          searchPlaceholder="Pesquisar cliente ou produto…"
          searchValue={(row) => `${row.name} ${row.products.join(" ")}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
