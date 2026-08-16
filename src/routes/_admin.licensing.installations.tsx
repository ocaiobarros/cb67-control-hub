import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Installation } from "@/types";

export const Route = createFileRoute("/_admin/licensing/installations")({
  head: () => ({
    meta: [
      { title: "Installations — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Licensed product installations with version, heartbeat, lease binding and grace period state.",
      },
      { property: "og:title", content: "Installations — CB67 Labs Control Center" },
      { property: "og:description", content: "Heartbeats, versions and grace periods per installation." },
    ],
  }),
  component: InstallationsPage,
});

function InstallationsPage() {
  const installations = useQuery(q.installations());
  const rows = installations.data ?? [];

  const inGrace = rows.filter((row) => row.graceUntil !== null);
  const byVersion = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.version] = (acc[row.version] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value);

  const columns: Column<Installation>[] = [
    {
      id: "installation",
      header: "Installation",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.productName}</p>
          <code className="mono-xs text-muted-foreground">{row.version}</code>
        </div>
      ),
      sortValue: (row) => row.productName,
    },
    {
      id: "license",
      header: "Licence",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.licenseKey}</code>,
      sortValue: (row) => row.licenseKey,
    },
    {
      id: "lease",
      header: "Lease",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.leaseId}</code>,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Heartbeat",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
      align: "right",
    },
    {
      id: "grace",
      header: "Grace until",
      cell: (row) => (
        <span className={row.graceUntil ? "mono-xs text-warn" : "mono-xs text-muted-foreground"}>
          {row.graceUntil ? formatDateTime(row.graceUntil) : "—"}
        </span>
      ),
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
        title="Installations"
        description="An installation is a licensed product instance running in a customer environment. Offline installations keep operating until their lease or grace window ends."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Installations" value={rows.length} isLoading={installations.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={installations.isLoading}
        />
        <MetricCard
          label="In grace"
          value={inGrace.length}
          tone={inGrace.length > 0 ? "warn" : "ok"}
          hint="Operating without a fresh lease"
          isLoading={installations.isLoading}
        />
        <MetricCard
          label="Distinct versions"
          value={byVersion.length}
          hint="Version drift across the fleet"
          isLoading={installations.isLoading}
        />
      </div>

      <ChartPanel
        title="Version distribution"
        description="Installations per product version."
        isLoading={installations.isLoading}
        error={installations.error ?? undefined}
        isEmpty={byVersion.length === 0}
      >
        <CategoryBarChart data={byVersion} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Installation registry" description="Heartbeats are reported by the installed product." />
        <DataTable
          data={installations.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={installations.isLoading}
          error={installations.error ?? undefined}
          searchPlaceholder="Search installation, licence or product…"
          searchValue={(row) => `${row.installationId} ${row.licenseKey} ${row.productName}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
