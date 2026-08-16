import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { MetricCard } from "@/components/common/metric-card";
import { Badge } from "@/components/ui/badge";
import { formatCompact, formatMs, formatPercent, formatRelative } from "@/utils/format";
import type { Application } from "@/types";

export const Route = createFileRoute("/_admin/saas/applications/")({
  head: () => ({
    meta: [
      { title: "SaaS Applications — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registry of SaaS applications consuming the CB67 Labs API: environment, licensing, certificate posture and traffic.",
      },
      { property: "og:title", content: "SaaS Applications — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Environment, licensing, certificate posture and traffic per application.",
      },
    ],
  }),
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const applications = useQuery(q.applications());
  const navigate = useNavigate();
  const rows = applications.data ?? [];

  const columns: Column<Application>[] = [
    {
      id: "name",
      header: "Application",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="mono-xs text-muted-foreground">{row.code}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
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
    { id: "instances", header: "Instances", cell: (row) => <span className="tabular">{row.instances}</span>, sortValue: (row) => row.instances, align: "right" },
    {
      id: "requests",
      header: "Requests 30d",
      cell: (row) => <span className="tabular">{formatCompact(row.requests30d)}</span>,
      sortValue: (row) => row.requests30d,
      align: "right",
    },
    {
      id: "errorRate",
      header: "Error rate",
      cell: (row) => (
        <span className={row.errorRate > 1 ? "tabular text-warn" : "tabular"}>
          {formatPercent(row.errorRate)}
        </span>
      ),
      sortValue: (row) => row.errorRate,
      align: "right",
    },
    { id: "p95", header: "p95", cell: (row) => <span className="tabular">{formatMs(row.p95Ms)}</span>, sortValue: (row) => row.p95Ms, align: "right" },
    {
      id: "license",
      header: "License",
      cell: (row) => <StatusBadge status={row.licenseStatus} />,
      sortValue: (row) => row.licenseStatus,
    },
    {
      id: "certificate",
      header: "Certificate",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Last seen",
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
        title="SaaS Applications"
        description="Every application registered as an API consumer. Select a row to inspect credentials, quotas, instances and audit history."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Registered" value={rows.length} isLoading={applications.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((r) => r.status === "active").length}
          tone="ok"
          isLoading={applications.isLoading}
        />
        <MetricCard
          label="License attention"
          value={rows.filter((r) => r.licenseStatus !== "active").length}
          tone="warn"
          hint="Grace, expired, suspended or revoked"
          isLoading={applications.isLoading}
        />
        <MetricCard
          label="Cert attention"
          value={rows.filter((r) => r.certificateStatus !== "active").length}
          tone="warn"
          hint="Expiring or revoked mTLS material"
          isLoading={applications.isLoading}
        />
      </div>

      <DataTable
        data={applications.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={applications.isLoading}
        error={applications.error ?? undefined}
        searchPlaceholder="Search applications, codes…"
        onRowClick={(row) => {
          void navigate({ to: `/saas/applications/${row.id}` as never });
        }}
      />
    </div>
  );
}
