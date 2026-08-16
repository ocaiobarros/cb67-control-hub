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
      { title: "Licence Features — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Feature flag catalogue: which licensed products and plans unlock each capability granted through a lease.",
      },
      { property: "og:title", content: "Licence Features — CB67 Labs Control Center" },
      { property: "og:description", content: "Feature flags mapped to products and plans." },
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
      header: "Feature",
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
      header: "Description",
      cell: (row) => <p className="max-w-md text-xs text-muted-foreground">{row.description}</p>,
    },
    {
      id: "products",
      header: "Products",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{row.products.join(" · ")}</span>
      ),
    },
    {
      id: "plans",
      header: "Plans",
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
        title="Licence Features"
        description="Features are the atomic entitlements embedded in each signed lease. Products read them at runtime to enable capabilities."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Features" value={rows.length} isLoading={features.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={features.isLoading}
        />
        <MetricCard
          label="Products covered"
          value={new Set(rows.flatMap((row) => row.products)).size}
          isLoading={features.isLoading}
        />
        <MetricCard
          label="Plans referencing"
          value={new Set(rows.flatMap((row) => row.plans)).size}
          isLoading={features.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Feature catalogue" description="Codes are stable identifiers consumed by products." />
        <DataTable
          data={features.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={features.isLoading}
          error={features.error ?? undefined}
          searchPlaceholder="Search feature or code…"
          searchValue={(row) => `${row.name} ${row.code} ${row.description}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
