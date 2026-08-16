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
      { title: "Licence Plans — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Commercial plans with installation ceilings, bundled feature flags and the number of licences sold on each tier.",
      },
      { property: "og:title", content: "Licence Plans — CB67 Labs Control Center" },
      { property: "og:description", content: "Ceilings, bundled features and adoption per plan." },
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
      header: "Plan",
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
      header: "Installation ceiling",
      cell: (row) => <span className="tabular">{formatNumber(row.maxInstallations)}</span>,
      sortValue: (row) => row.maxInstallations,
      align: "right",
    },
    {
      id: "features",
      header: "Bundled features",
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
        title="Licence Plans"
        description="Plans express what a customer may run: how many installations and which feature flags are granted. Pricing is intentionally out of scope for this interface."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Plans" value={rows.length} isLoading={plans.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Licences on plan"
          value={formatNumber(rows.reduce((sum, row) => sum + row.activeLicenses, 0))}
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Distinct features"
          value={new Set(rows.flatMap((row) => row.features)).size}
          isLoading={plans.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Plan catalogue" description="Feature bundles are resolved at lease issuance." />
        <DataTable
          data={plans.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={plans.isLoading}
          error={plans.error ?? undefined}
          searchPlaceholder="Search plan or code…"
          searchValue={(row) => `${row.name} ${row.code}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
