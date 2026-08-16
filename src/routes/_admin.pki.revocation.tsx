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
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";
import type { Certificate, Revocation } from "@/types";

export const Route = createFileRoute("/_admin/pki/revocation")({
  head: () => ({
    meta: [
      { title: "Certificate Revocation — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Certificate revocation list with revoked serials, reasons and the controls to revoke an active certificate.",
      },
      { property: "og:title", content: "Certificate Revocation — CB67 Labs Control Center" },
      { property: "og:description", content: "Revocation list and immediate revocation controls." },
    ],
  }),
  component: RevocationPage,
});

function RevocationPage() {
  const certificates = useQuery(q.certificates());
  const revocations = useQuery(q.revocations());
  const action = useAdminAction();
  const [target, setTarget] = useState<Certificate | null>(null);

  const all = certificates.data ?? [];
  const revoked = all.filter((row) => row.status === "revoked");
  const active = all.filter((row) => row.status === "active");
  const ledger = (revocations.data ?? []).filter((row) => row.type === "certificate");

  const revokedColumns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Subject",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.serial}</code>
        </div>
      ),
      sortValue: (row) => row.subject,
    },
    {
      id: "client",
      header: "Bound client",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
    },
    {
      id: "expires",
      header: "Original expiry",
      cell: (row) => <span className="mono-xs">{formatDate(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  const activeColumns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Subject",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.serial}</code>
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
      id: "expires",
      header: "Expires",
      cell: (row) => <span className="mono-xs">{formatDate(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="pki:write">
          <Button
            variant="destructive"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Revoke
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  const ledgerColumns: Column<Revocation>[] = [
    {
      id: "object",
      header: "Serial",
      cell: (row) => <code className="mono-xs text-foreground">{row.object}</code>,
      sortValue: (row) => row.object,
    },
    {
      id: "reason",
      header: "Reason",
      cell: (row) => <p className="max-w-md text-sm">{row.reason}</p>,
    },
    {
      id: "actor",
      header: "Actor",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.actor}</span>,
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificate Revocation"
        description="Revocation is immediate and irreversible. The revocation list is published to every mTLS terminator so rejected serials stop authenticating on the next handshake."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Revoked certificates"
          value={revoked.length}
          tone={revoked.length > 0 ? "crit" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard label="Active certificates" value={active.length} tone="ok" isLoading={certificates.isLoading} />
        <MetricCard label="Ledger entries" value={ledger.length} isLoading={revocations.isLoading} />
        <MetricCard
          label="Last revocation"
          value={ledger[0] ? formatRelative(ledger[0].createdAt) : "—"}
          isLoading={revocations.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Distribution</h3>
        <dl className="mt-2">
          <StatRow label="Publication" value="Revocation list served by the internal certificate authority" />
          <StatRow label="Propagation" value="Applied at the next TLS handshake" />
          <StatRow label="Reversibility" value="None — a replacement certificate must be issued" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Revocation ledger" description="Certificate entries only." />
        <DataTable
          data={ledger}
          columns={ledgerColumns}
          rowKey={(row) => row.id}
          isLoading={revocations.isLoading}
          error={revocations.error ?? undefined}
          emptyMessage="No certificate revocations recorded."
          dense
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Revoked certificates" description="Serials rejected at the mTLS boundary." />
        <DataTable
          data={revoked}
          columns={revokedColumns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          emptyMessage="No revoked certificates."
          dense
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Revoke an active certificate"
          description="Only use this when a private key is suspected compromised or the bound client is decommissioned."
        />
        <DataTable
          data={active}
          columns={activeColumns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          searchPlaceholder="Search subject or serial…"
          searchValue={(row) => `${row.subject} ${row.serial} ${row.clientId}`}
          pageSize={10}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Revoke certificate"
        warning="The serial is published to the revocation list immediately. The bound client will fail mTLS authentication until a new certificate is issued and installed."
        details={
          target
            ? [
                { label: "Subject", value: target.subject },
                { label: "Serial", value: target.serial },
                { label: "Bound client", value: target.clientId },
              ]
            : undefined
        }
        confirmLabel="Revoke certificate"
        requireTypedValue={target?.serial}
        environmentNotice="The operation is re-authorised and audited server-side."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "certificate.revoke", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
