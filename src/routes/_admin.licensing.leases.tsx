import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Lease } from "@/types";

export const Route = createFileRoute("/_admin/licensing/leases")({
  head: () => ({
    meta: [
      { title: "Leases — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Signed licence leases with issue and expiry timestamps, bound installation and the signing key used.",
      },
      { property: "og:title", content: "Leases — CB67 Labs Control Center" },
      { property: "og:description", content: "Lease lifecycle, validity and signing key rotation." },
    ],
  }),
  component: LeasesPage,
});

function LeasesPage() {
  const leases = useQuery(q.leases());
  const rows = leases.data ?? [];

  const byKey = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.keyId] = (acc[row.keyId] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const columns: Column<Lease>[] = [
    {
      id: "lease",
      header: "Lease",
      cell: (row) => <IdentifierCell value={row.leaseId} label="lease id" />,
      sortValue: (row) => row.leaseId,
    },
    {
      id: "license",
      header: "Licence",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.licenseKey}</code>,
      sortValue: (row) => row.licenseKey,
    },
    {
      id: "installation",
      header: "Installation",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.installationId}</code>,
      sortValue: (row) => row.installationId,
    },
    {
      id: "issued",
      header: "Issued",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.issuedAt)}</span>,
      sortValue: (row) => row.issuedAt,
      align: "right",
    },
    {
      id: "expires",
      header: "Expires",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.expiresAt)}</p>
        </div>
      ),
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "keyId",
      header: "Signing key",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.keyId}</code>,
      sortValue: (row) => row.keyId,
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
        title="Leases"
        description="Leases are signed offline-verifiable authorisations. Installations renew them periodically; a revoked licence simply stops receiving new leases."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Leases" value={rows.length} isLoading={leases.isLoading} />
        <MetricCard
          label="Valid"
          value={rows.filter((row) => row.status === "valid").length}
          tone="ok"
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Grace"
          value={rows.filter((row) => row.status === "grace").length}
          tone="warn"
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Revoked or expired"
          value={rows.filter((row) => row.status === "revoked" || row.status === "expired").length}
          tone="crit"
          isLoading={leases.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Signing keys in use</h3>
        <dl className="mt-2">
          {byKey.map(([keyId, count]) => (
            <StatRow key={keyId} label={keyId} value={`${count} leases`} />
          ))}
          {byKey.length === 0 && (
            <p className="text-xs text-muted-foreground">No leases issued in this dataset.</p>
          )}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Key rotation is handled by the licensing service; installations trust the published key set.
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Lease ledger" description="Ordered by expiry when sorted on that column." />
        <DataTable
          data={leases.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={leases.isLoading}
          error={leases.error ?? undefined}
          searchPlaceholder="Search lease, licence or installation…"
          searchValue={(row) => `${row.leaseId} ${row.licenseKey} ${row.installationId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
