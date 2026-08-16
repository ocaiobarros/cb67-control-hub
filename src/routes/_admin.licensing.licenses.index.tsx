import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { daysUntil, formatDate, formatNumber, formatRelative } from "@/utils/format";
import type { License } from "@/types";

export const Route = createFileRoute("/_admin/licensing/licenses/")({
  head: () => ({
    meta: [
      { title: "Licences — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Issued CB67 Labs licences with plan, validity window, installation consumption and last validation timestamp.",
      },
      { property: "og:title", content: "Licences — CB67 Labs Control Center" },
      { property: "og:description", content: "Validity, installations and validation activity." },
    ],
  }),
  component: LicensesPage,
});

function LicensesPage() {
  const licenses = useQuery(q.licenses());
  const navigate = useNavigate();
  const rows = licenses.data ?? [];

  const columns: Column<License>[] = [
    {
      id: "key",
      header: "Licence key",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.key}</code>
          <p className="text-xs text-muted-foreground">{row.customerName}</p>
        </div>
      ),
      sortValue: (row) => row.key,
    },
    {
      id: "product",
      header: "Product",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.productName}</p>
          <span className="mono-xs text-muted-foreground">{row.plan}</span>
        </div>
      ),
      sortValue: (row) => row.productName,
    },
    {
      id: "validity",
      header: "Validity",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDate(row.startsAt)} → {formatDate(row.expiresAt)}</span>
          <p
            className={
              daysUntil(row.expiresAt) <= 0
                ? "mono-xs text-crit"
                : daysUntil(row.expiresAt) <= 30
                  ? "mono-xs text-warn"
                  : "mono-xs text-muted-foreground"
            }
          >
            {daysUntil(row.expiresAt) <= 0
              ? "expired"
              : `${daysUntil(row.expiresAt)} days remaining`}
          </p>
        </div>
      ),
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "installations",
      header: "Installations",
      cell: (row) => (
        <span
          className={
            row.installations >= row.maxInstallations ? "tabular text-warn" : "tabular"
          }
        >
          {row.installations} / {row.maxInstallations}
        </span>
      ),
      sortValue: (row) => row.installations / Math.max(1, row.maxInstallations),
      align: "right",
    },
    {
      id: "validation",
      header: "Last validation",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastValidationAt)}</span>
      ),
      sortValue: (row) => row.lastValidationAt,
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

  const expiring = rows.filter(
    (row) => daysUntil(row.expiresAt) > 0 && daysUntil(row.expiresAt) <= 30,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licences"
        description="A licence binds a customer and product to a plan and installation ceiling. Select a row to inspect installations, leases and revocation history."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Licences" value={rows.length} isLoading={licenses.isLoading} />
        <MetricCard
          label="Active"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={licenses.isLoading}
        />
        <MetricCard
          label="Expiring 30d"
          value={expiring.length}
          tone={expiring.length > 0 ? "warn" : "ok"}
          isLoading={licenses.isLoading}
        />
        <MetricCard
          label="Installations bound"
          value={formatNumber(rows.reduce((sum, row) => sum + row.installations, 0))}
          isLoading={licenses.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Issued licences" description="Click a licence to open its record." />
        <DataTable
          data={licenses.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={licenses.isLoading}
          error={licenses.error ?? undefined}
          searchPlaceholder="Search key, customer or product…"
          searchValue={(row) => `${row.key} ${row.customerName} ${row.productName} ${row.plan}`}
          pageSize={15}
          onRowClick={(row) => {
            void navigate({ to: `/licensing/licenses/${row.id}` as never });
          }}
        />
      </div>
    </div>
  );
}
