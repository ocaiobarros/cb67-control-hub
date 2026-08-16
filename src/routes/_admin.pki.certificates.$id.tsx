import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline, type TimelineItem } from "@/components/common/activity-timeline";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { daysUntil, formatDate, formatDateTime } from "@/utils/format";

export const Route = createFileRoute("/_admin/pki/certificates/$id")({
  head: () => ({
    meta: [
      { title: "Certificate Record — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Certificate record with issuer chain, fingerprint, validity window, bound client and rotation or revocation controls.",
      },
      { property: "og:title", content: "Certificate Record — CB67 Labs Control Center" },
      { property: "og:description", content: "Fingerprint, chain, validity and revocation controls." },
    ],
  }),
  component: CertificateDetail,
});

function CertificateDetail() {
  const { id } = Route.useParams();
  const certificate = useQuery(q.certificate(id));
  const audit = useQuery(q.auditEvents());
  const action = useAdminAction();
  const [pending, setPending] = useState<"rotate" | "revoke" | null>(null);

  const record = certificate.data;

  const timeline: TimelineItem[] = (audit.data ?? [])
    .filter((event) => (record ? event.resourceId === record.id || event.resourceId === record.serial : false))
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: event.action,
      detail: `${event.actor} · ${event.source}`,
      status: event.result,
    }));

  if (certificate.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Certificate unavailable" description="The certificate record could not be loaded." />
        <EmptyState message="Certificate not found" hint="Verify the identifier and try again." />
      </div>
    );
  }

  const remaining = record ? daysUntil(record.expiresAt) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={record?.subject ?? "Certificate"}
        description="Rotation issues a new certificate for the same subject and keeps the previous one valid until its expiry. Revocation is immediate and irreversible."
        meta={record ? <StatusBadge status={record.status} /> : undefined}
        actions={
          <Permitted permission="pki:write">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending("rotate")}>
                Rotate
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setPending("revoke")}>
                Revoke
              </Button>
            </div>
          </Permitted>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Remaining validity"
          value={record ? `${Math.max(0, remaining)} days` : "—"}
          tone={remaining <= 0 ? "crit" : remaining <= 30 ? "warn" : "ok"}
          isLoading={certificate.isLoading}
        />
        <MetricCard label="Type" value={record?.type ?? "—"} isLoading={certificate.isLoading} />
        <MetricCard
          label="Issued"
          value={record ? formatDate(record.issuedAt) : "—"}
          isLoading={certificate.isLoading}
        />
        <MetricCard
          label="Expires"
          value={record ? formatDate(record.expiresAt) : "—"}
          isLoading={certificate.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Certificate record</h3>
          <dl className="mt-2">
            <StatRow label="Subject" value={record?.subject ?? "—"} />
            <StatRow label="Issuer" value={record?.issuer ?? "—"} />
            <StatRow
              label="Serial"
              value={record ? <IdentifierCell value={record.serial} label="serial" /> : "—"}
            />
            <StatRow
              label="Fingerprint (SHA-256)"
              value={record ? <IdentifierCell value={record.fingerprint} label="fingerprint" /> : "—"}
            />
            <StatRow
              label="Bound client"
              value={record ? <IdentifierCell value={record.clientId} label="client id" /> : "—"}
            />
            <StatRow
              label="Validity"
              value={record ? `${formatDateTime(record.issuedAt)} → ${formatDateTime(record.expiresAt)}` : "—"}
            />
          </dl>
        </section>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Certificate activity</h3>
          <div className="mt-3">
            <ActivityTimeline items={timeline} />
          </div>
        </section>
      </div>

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === "revoke" ? "Revoke certificate" : "Rotate certificate"}
        warning={
          pending === "revoke"
            ? "The certificate is added to the revocation list immediately. Any mTLS connection presenting it is rejected, which will break the bound client until a new certificate is installed."
            : "A replacement certificate is issued for the same subject. The client must install it before the current certificate expires."
        }
        details={
          record
            ? [
                { label: "Subject", value: record.subject },
                { label: "Serial", value: record.serial },
                { label: "Bound client", value: record.clientId },
              ]
            : undefined
        }
        confirmLabel={pending === "revoke" ? "Revoke certificate" : "Rotate certificate"}
        requireTypedValue={pending === "revoke" ? record?.serial : undefined}
        environmentNotice="PKI operations are re-authorised and audited server-side."
        onConfirm={async () => {
          if (!record || !pending) return;
          await action.mutateAsync({
            action: pending === "revoke" ? "certificate.revoke" : "certificate.rotate",
            resourceId: record.id,
          });
          setPending(null);
        }}
      />
    </div>
  );
}
