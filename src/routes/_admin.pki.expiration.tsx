import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { daysUntil, formatDate } from "@/utils/format";
import type { Certificate } from "@/types";

export const Route = createFileRoute("/_admin/pki/expiration")({
  head: () => ({
    meta: [
      { title: "Certificate Expiration — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Expiration horizon for the internal PKI: certificates grouped by remaining validity so renewals are scheduled before outage risk.",
      },
      { property: "og:title", content: "Certificate Expiration — CB67 Labs Control Center" },
      { property: "og:description", content: "Renewal horizon grouped by remaining validity." },
    ],
  }),
  component: ExpirationPage,
});

const BUCKETS = [
  { label: "Expired", min: -Infinity, max: 0 },
  { label: "0–7 days", min: 0, max: 7 },
  { label: "8–30 days", min: 7, max: 30 },
  { label: "31–90 days", min: 30, max: 90 },
  { label: "90+ days", min: 90, max: Infinity },
];

function bucketOf(cert: Certificate) {
  const days = daysUntil(cert.expiresAt);
  return BUCKETS.find((bucket) => days > bucket.min && days <= bucket.max) ?? BUCKETS[BUCKETS.length - 1];
}

function ExpirationPage() {
  const certificates = useQuery(q.certificates());
  const rows = certificates.data ?? [];

  const chart = BUCKETS.map((bucket) => ({
    t: bucket.label,
    value: rows.filter((row) => bucketOf(row)?.label === bucket.label).length,
  }));

  const urgent = [...rows]
    .filter((row) => row.status !== "revoked")
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));

  const columns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Subject",
      cell: (row) => (
        <AppLink to={`/pki/certificates/${row.id}`} className="text-sm font-medium hover:underline">
          {row.subject}
        </AppLink>
      ),
      sortValue: (row) => row.subject,
    },
    {
      id: "type",
      header: "Type",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.type}</span>,
      sortValue: (row) => row.type,
    },
    {
      id: "client",
      header: "Bound client",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
    },
    {
      id: "remaining",
      header: "Remaining",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <span className={days <= 0 ? "tabular text-crit" : days <= 30 ? "tabular text-warn" : "tabular"}>
            {days <= 0 ? "expired" : `${days} days`}
          </span>
        );
      },
      sortValue: (row) => daysUntil(row.expiresAt),
      align: "right",
    },
    {
      id: "expires",
      header: "Expires",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDate(row.expiresAt)}</span>,
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

  const expired = rows.filter((row) => daysUntil(row.expiresAt) <= 0);
  const within7 = rows.filter((row) => daysUntil(row.expiresAt) > 0 && daysUntil(row.expiresAt) <= 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Expiration"
        description="An expired client certificate silently breaks mTLS authentication. Renewals should be scheduled at least thirty days ahead of the expiry date."
        meta={<StatusBadge status={expired.length > 0 ? "critical" : within7.length > 0 ? "warn" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expired"
          value={expired.length}
          tone={expired.length > 0 ? "crit" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Next 7 days"
          value={within7.length}
          tone={within7.length > 0 ? "warn" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Next 30 days"
          value={rows.filter((row) => daysUntil(row.expiresAt) > 7 && daysUntil(row.expiresAt) <= 30).length}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Beyond 90 days"
          value={rows.filter((row) => daysUntil(row.expiresAt) > 90).length}
          tone="ok"
          isLoading={certificates.isLoading}
        />
      </div>

      <ChartPanel
        title="Expiration horizon"
        description="Certificates grouped by remaining validity."
        isLoading={certificates.isLoading}
        error={certificates.error ?? undefined}
        isEmpty={chart.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={chart} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Renewal queue" description="Ordered by remaining validity, revoked certificates excluded." />
        <DataTable
          data={urgent}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          searchPlaceholder="Search subject or client…"
          searchValue={(row) => `${row.subject} ${row.clientId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
