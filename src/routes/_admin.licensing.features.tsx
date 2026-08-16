import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import type { LicenseFeature } from "@/types";

export const Route = createFileRoute("/_admin/licensing/features")({
  head: () => ({
    meta: [
      { title: "Recursos de Licença — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Catálogo de recursos: quais produtos licenciados e planos desbloqueiam cada capacidade concedida por meio de uma concessão.",
      },
      { property: "og:title", content: "Recursos de Licença — CB67 Labs Control Center" },
      { property: "og:description", content: "Recursos mapeados para produtos e planos." },
    ],
  }),
  component: FeaturesPage,
});

function FeaturesPage() {
  const features = useQuery(q.features());
  const rows = features.data ?? [];

  const columns: Column<LicenseFeature>[] = [
    {
      id: "name",
      header: "Recurso",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "description",
      header: "Descrição",
      cell: (row) => <p className="max-w-md text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "products",
      header: "Produtos",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.products.join(" · ")}</span>
      ),
    },
    {
      id: "plans",
      header: "Planos",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.plans.map((plan) => (
            <span key={plan} className="rounded border border-border px-1.5 py-0.5 text-xs">
              {plan}
            </span>
          ))}
        </div>
      ),
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
        title="Recursos de Licença"
        description="Os recursos são os direitos atômicos embutidos em cada concessão assinada. Os produtos os lêem em tempo de execução para habilitar capacidades."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Recursos" value={rows.length} isLoading={features.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={features.isLoading}
        />
        <MetricCard
          label="Produtos cobertos"
          value={new Set(rows.flatMap((row) => row.products)).size}
          isLoading={features.isLoading}
        />
        <MetricCard
          label="Planos que referenciam"
          value={new Set(rows.flatMap((row) => row.plans)).size}
          isLoading={features.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Catálogo de recursos" description="Os códigos são identificadores estáveis consumidos pelos produtos." />
        <DataTable
          data={features.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={features.isLoading}
          error={features.error ?? undefined}
          searchPlaceholder="Pesquisar recurso ou código…"
          searchValue={(row) => `${row.name} ${row.code} ${row.description}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
