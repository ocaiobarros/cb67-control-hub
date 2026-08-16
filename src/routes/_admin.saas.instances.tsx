import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { IdentifierCell } from "@/components/common/copy-button";
import { Badge } from "@/components/ui/badge";
import { formatRelative } from "@/utils/format";
import type { Instance } from "@/types";

export const Route = createFileRoute("/_admin/saas/instances")({
  head: () => ({
    meta: [
      { title: "SaaS Instances — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Every deployed instance reporting to the CB67 Labs platform, with installation identity, version drift and certificate posture.",
      },
      { property: "og:title", content: "SaaS Instances — CB67 Labs Control Center" },
      { property: "og:description", content: "Installation identity, version drift and heartbeat." },
    ],
  }),
  component: InstancesPage,
});

function InstancesPage() {
  const instances = useQuery(q.instances());
  const rows = instances.data ?? [];
  const versions = new Set(rows.map((row) => row.version));

  const columns: Column<Instance>[] = [
    {
      id: "installationId",
      header: "Installation",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    { id: "hostLabel", header: "Host", cell: (row) => <span className="text-sm">{row.hostLabel}</span>, sortValue: (row) => row.hostLabel },
    {
      id: "environment",
      header: "Env",
      cell: (row) => (
        <Badge variant="outline" className="mono-xs">
          {row.environment}
        </Badge>
      ),
      sortValue: (row) => row.environment,
    },
    { id: "version", header: "Version", cell: (row) => <span className="mono-xs">{row.version}</span>, sortValue: (row) => row.version },
    {
      id: "licenseId",
      header: "License",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.licenseId}</span>,
      hideByDefault: true,
    },
    {
      id: "certificateStatus",
      header: "Certificate",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
    },
    {
      id: "lastSeen",
      header: "Heartbeat",
      cell: (row) => <span className="text-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
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
        title="SaaS Instances"
        description="Instances are identified by installation ID and authenticate with mTLS. Missing heartbeats or version drift usually precede licensing incidents."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Reporting" value={rows.length} isLoading={instances.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={instances.isLoading}
        />
        <MetricCard
          label="Distinct versions"
          value={versions.size}
          tone={versions.size > 3 ? "warn" : "neutral"}
          hint="Version drift across the fleet"
          isLoading={instances.isLoading}
        />
        <MetricCard
          label="Cert attention"
          value={rows.filter((r) => r.certificateStatus !== "active").length}
          tone="warn"
          isLoading={instances.isLoading}
        />
      </div>

      <DataTable
        data={instances.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={instances.isLoading}
        error={instances.error ?? undefined}
        searchPlaceholder="Search installations, hosts…"
        pageSize={15}
      />
    </div>
  );
}
