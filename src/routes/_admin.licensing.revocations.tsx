import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Revocation } from "@/types";

export const Route = createFileRoute("/_admin/licensing/revocations")({
  head: () => ({
    meta: [
      { title: "Revocations — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Revocation ledger covering licences, installations, machine clients and certificates, with reason and responsible actor.",
      },
      { property: "og:title", content: "Revocations — CB67 Labs Control Center" },
      { property: "og:description", content: "Irreversible revocations with reason and actor." },
    ],
  }),
  component: RevocationsPage,
});

const TYPE_LABEL: Record<Revocation["type"], string> = {
  license: "Licence",
  installation: "Installation",
  client: "Machine client",
  certificate: "Certificate",
};

function RevocationsPage() {
  const revocations = useQuery(q.revocations());
  const rows = revocations.data ?? [];

  const byType = (Object.keys(TYPE_LABEL) as Revocation["type"][]).map((type) => ({
    t: TYPE_LABEL[type],
    value: rows.filter((row) => row.type === type).length,
  }));

  const columns: Column<Revocation>[] = [
    {
      id: "object",
      header: "Object",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.object}</code>
          <p className="text-xs text-muted-foreground">{TYPE_LABEL[row.type]}</p>
        </div>
      ),
      sortValue: (row) => row.object,
    },
    {
      id: "reason",
      header: "Reason",
      cell: (row) => <p className="max-w-md text-sm">{row.reason}</p>,
      sortValue: (row) => row.reason,
    },
    {
      id: "actor",
      header: "Actor",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.actor}</span>,
      sortValue: (row) => row.actor,
    },
    {
      id: "createdAt",
      header: "Recorded",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.createdAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.createdAt)}</p>
        </div>
      ),
      sortValue: (row) => row.createdAt,
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
        title="Revocations"
        description="The revocation ledger is append-only. Entries are published to the distribution points that installations and mTLS consumers consult."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Entries" value={rows.length} isLoading={revocations.isLoading} />
        <MetricCard
          label="Licences"
          value={rows.filter((row) => row.type === "license").length}
          isLoading={revocations.isLoading}
        />
        <MetricCard
          label="Certificates"
          value={rows.filter((row) => row.type === "certificate").length}
          isLoading={revocations.isLoading}
        />
        <MetricCard
          label="Machine clients"
          value={rows.filter((row) => row.type === "client").length}
          isLoading={revocations.isLoading}
        />
      </div>

      <ChartPanel
        title="Revocations by object type"
        description="Composition of the ledger in the current dataset."
        isLoading={revocations.isLoading}
        error={revocations.error ?? undefined}
        isEmpty={byType.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={byType} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Revocation ledger"
          description="Every entry is irreversible and mirrored in the audit trail."
        />
        <DataTable
          data={revocations.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={revocations.isLoading}
          error={revocations.error ?? undefined}
          searchPlaceholder="Search object, reason or actor…"
          searchValue={(row) => `${row.object} ${row.reason} ${row.actor}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
