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
      { title: "Licensing Overview — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Licence portfolio health: active, grace, suspended, expired and revoked licences with expiration timeline and activation trend.",
      },
      { property: "og:title", content: "Licensing Overview — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Portfolio status, distribution by product and plan, and upcoming expirations.",
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
      header: "Licence",
      cell: (row) => (
        <AppLink to={`/licensing/licenses/${row.id}`} className="hover:underline">
          <code className="mono-xs text-foreground">{row.key}</code>
        </AppLink>
      ),
      sortValue: (row) => row.key,
    },
    {
      id: "customer",
      header: "Customer",
      cell: (row) => <span className="text-sm">{row.customerName}</span>,
      sortValue: (row) => row.customerName,
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => <span className="text-sm text-muted-foreground">{row.productName}</span>,
      sortValue: (row) => row.productName,
    },
    {
      id: "expires",
      header: "Expires",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <div className="text-right">
            <span className="mono-xs">{formatDate(row.expiresAt)}</span>
            <p className={days <= 15 ? "mono-xs text-crit" : "mono-xs text-muted-foreground"}>
              in {days} days
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
        title="Licensing Overview"
        description="The licensing service issues signed leases to installed products. Validation happens offline against a published key set, so revocation propagates on the next lease renewal."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
        <MetricCard label="Active" value={data?.active ?? "—"} tone="ok" isLoading={overview.isLoading} />
        <MetricCard label="Grace" value={data?.grace ?? "—"} tone="warn" isLoading={overview.isLoading} />
        <MetricCard label="Suspended" value={data?.suspended ?? "—"} tone="warn" isLoading={overview.isLoading} />
        <MetricCard label="Expired" value={data?.expired ?? "—"} tone="crit" isLoading={overview.isLoading} />
        <MetricCard label="Revoked" value={data?.revoked ?? "—"} tone="crit" isLoading={overview.isLoading} />
        <MetricCard
          label="Expiring 30d"
          value={data?.expiringSoon ?? "—"}
          hint="Renewal outreach window"
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Licences by product"
          description="Portfolio distribution across licensed products."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.byProduct.length ?? 0) === 0}
        >
          <DonutChart data={data?.byProduct ?? []} />
        </ChartPanel>
        <ChartPanel
          title="Licences by plan"
          description="Commercial tier mix."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.byPlan.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.byPlan ?? []} colorByIndex />
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Expiration timeline"
          description="Licences reaching their end date per upcoming period."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.expirationTimeline.length ?? 0) === 0}
        >
          <CategoryBarChart data={data?.expirationTimeline ?? []} />
        </ChartPanel>
        <ChartPanel
          title="Activations"
          description="New installations bound to a licence."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(data?.activations.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={data?.activations ?? []}
            series={[{ key: "value", label: "Activations" }]}
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Nearest expirations"
          description="Active and grace licences ordered by remaining validity."
          actions={
            <AppLink to="/licensing/licenses" className="text-xs text-primary hover:underline">
              All licences
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
        Portfolio totals cover {formatCompact((licenses.data ?? []).length)} licence records in the
        current dataset.
      </p>
    </div>
  );
}
