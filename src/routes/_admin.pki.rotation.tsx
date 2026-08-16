import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { daysUntil, formatDate } from "@/utils/format";
import type { Certificate } from "@/types";

export const Route = createFileRoute("/_admin/pki/rotation")({
  head: () => ({
    meta: [
      { title: "Certificate Rotation — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Rotation planning for the internal PKI: which certificates to reissue next and the operational policy that governs the exchange.",
      },
      { property: "og:title", content: "Certificate Rotation — CB67 Labs Control Center" },
      { property: "og:description", content: "Rotation candidates and reissue policy." },
    ],
  }),
  component: RotationPage,
});

const POLICY = [
  { label: "Client certificate lifetime", value: "12 months (provisional)" },
  { label: "Server certificate lifetime", value: "6 months (provisional)" },
  { label: "Rotation window", value: "30 days before expiry" },
  { label: "Overlap", value: "Previous certificate stays valid until expiry" },
  { label: "Key generation", value: "Performed by the issuing host; keys never transit the UI" },
];

function RotationPage() {
  const certificates = useQuery(q.certificates());
  const action = useAdminAction();
  const [target, setTarget] = useState<Certificate | null>(null);

  const rows = (certificates.data ?? []).filter((row) => row.status !== "revoked");
  const candidates = rows.filter((row) => daysUntil(row.expiresAt) <= 60);

  const columns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Subject",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.clientId}</code>
        </div>
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
      id: "remaining",
      header: "Remaining",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <span className={days <= 7 ? "tabular text-crit" : days <= 30 ? "tabular text-warn" : "tabular"}>
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
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="pki:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Rotate
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Rotation"
        description="Rotation is an additive operation: a new certificate is issued while the current one remains valid, giving clients a window to install it without downtime."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Rotatable certificates" value={rows.length} isLoading={certificates.isLoading} />
        <MetricCard
          label="Within rotation window"
          value={candidates.length}
          tone={candidates.length > 0 ? "warn" : "ok"}
          hint="60 days or less remaining"
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Client certificates"
          value={rows.filter((row) => row.type === "client").length}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Server certificates"
          value={rows.filter((row) => row.type === "server").length}
          isLoading={certificates.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Rotation policy</h3>
        <dl className="mt-2">
          {POLICY.map((entry) => (
            <StatRow key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Lifetimes are provisional until the certificate authority configuration is published by the
          backend team.
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Rotation candidates"
          description="Certificates inside the rotation window, closest expiry first."
        />
        <DataTable
          data={[...candidates].sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          emptyMessage="No certificate is inside the rotation window."
          searchPlaceholder="Search subject or client…"
          searchValue={(row) => `${row.subject} ${row.clientId}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Rotate certificate"
        warning="A replacement certificate is issued for the same subject. The bound client must install it before the current certificate expires, otherwise mTLS authentication will fail."
        details={
          target
            ? [
                { label: "Subject", value: target.subject },
                { label: "Serial", value: target.serial },
                { label: "Expires", value: formatDate(target.expiresAt) },
              ]
            : undefined
        }
        confirmLabel="Rotate certificate"
        destructive={false}
        environmentNotice="Issuance happens on the certificate authority host and is recorded in the audit trail."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "certificate.rotate", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
