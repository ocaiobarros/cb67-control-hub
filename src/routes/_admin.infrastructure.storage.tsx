import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { ChartPanel, DonutChart } from "@/components/charts/chart-panel";
import { UsageCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatPercent } from "@/utils/format";
import type { Host } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/storage")({
  head: () => ({
    meta: [
      { title: "Storage — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Disk consumption by category and per host, including database, backup and log growth for the CB67 Labs platform.",
      },
      { property: "og:title", content: "Storage — CB67 Labs Control Center" },
      { property: "og:description", content: "Disk consumption by category and per host." },
    ],
  }),
  component: StoragePage,
});

function StoragePage() {
  const breakdown = useQuery(q.storageBreakdown());
  const hosts = useQuery(q.hosts());
  const database = useQuery(q.databaseHealth());

  const columns: Column<Host>[] = [
    { id: "name", header: "Host", cell: (row) => <span className="font-medium">{row.name}</span>, sortValue: (r) => r.name },
    { id: "role", header: "Role", cell: (row) => <span className="mono-xs">{row.role}</span> },
    {
      id: "storage",
      header: "Disk used",
      cell: (row) => (
        <div className="flex min-w-32 items-center gap-2">
          <Progress value={row.storage} className="h-1.5" />
          <span className="tabular w-12 text-right text-xs text-muted-foreground">
            {formatPercent(row.storage, 0)}
          </span>
        </div>
      ),
      sortValue: (row) => row.storage,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Storage"
        description="Disk allocation across the platform. Backup and log volumes are the fastest growing categories and should be reviewed against retention policy."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPanel
            title="Consumption by category"
            description="Share of total provisioned capacity."
            isLoading={breakdown.isLoading}
            error={breakdown.error ?? undefined}
            isEmpty={breakdown.data?.length === 0}
            height={260}
          >
            <DonutChart data={breakdown.data ?? []} />
          </ChartPanel>
        </div>
        <div className="space-y-3">
          <UsageCard
            label="Database size"
            used={database.data?.sizeBytes ?? 0}
            total={512 * 1024 ** 3}
            formatValue={formatBytes}
            hint="Provisioned volume for PostgreSQL"
          />
          <UsageCard
            label="Cluster disk"
            used={hosts.data?.reduce((sum, host) => sum + host.storage, 0) ?? 0}
            total={(hosts.data?.length ?? 1) * 100}
            formatValue={(value) => formatPercent(value, 0)}
            hint="Sum of per-host utilisation"
          />
        </div>
      </div>

      <DataTable
        data={hosts.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={hosts.isLoading}
        error={hosts.error ?? undefined}
        searchPlaceholder="Search hosts…"
      />
    </div>
  );
}
