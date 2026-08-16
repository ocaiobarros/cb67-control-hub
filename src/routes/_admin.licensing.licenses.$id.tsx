import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline, type TimelineItem } from "@/components/common/activity-timeline";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { daysUntil, formatDate, formatDateTime, formatRelative } from "@/utils/format";
import type { Installation, Lease } from "@/types";

export const Route = createFileRoute("/_admin/licensing/licenses/$id")({
  head: () => ({
    meta: [
      { title: "Licence Record — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Licence record with plan entitlements, bound installations, issued leases and revocation controls.",
      },
      { property: "og:title", content: "Licence Record — CB67 Labs Control Center" },
      { property: "og:description", content: "Entitlements, installations, leases and audit trail." },
    ],
  }),
  component: LicenseDetail,
});

function LicenseDetail() {
  const { id } = Route.useParams();
  const license = useQuery(q.license(id));
  const installations = useQuery(q.installations());
  const leases = useQuery(q.leases());
  const audit = useQuery(q.auditEvents());
  const action = useAdminAction();
  const [pending, setPending] = useState<"suspend" | "revoke" | null>(null);

  const record = license.data;
  const bound = (installations.data ?? []).filter((row) => row.licenseKey === record?.key);
  const issued = (leases.data ?? []).filter((row) => row.licenseKey === record?.key);

  const timeline: TimelineItem[] = (audit.data ?? [])
    .filter((event) => (record ? event.resourceId === record.id || event.resourceId === record.key : false))
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: event.action,
      detail: `${event.actor} · ${event.source}`,
      status: event.result,
    }));

  if (license.isError) {
    return (
      <div className="space-y-6">
        <PageHeader title="Licence unavailable" description="The licence record could not be loaded." />
        <EmptyState message="Licence not found" hint="Verify the identifier and try again." />
      </div>
    );
  }

  const installationColumns: Column<Installation>[] = [
    {
      id: "installation",
      header: "Installation",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    {
      id: "version",
      header: "Version",
      cell: (row) => <code className="mono-xs">{row.version}</code>,
      sortValue: (row) => row.version,
    },
    {
      id: "lastSeen",
      header: "Last seen",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
      align: "right",
    },
    {
      id: "grace",
      header: "Grace until",
      cell: (row) => (
        <span className="mono-xs">{row.graceUntil ? formatDateTime(row.graceUntil) : "—"}</span>
      ),
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

  const leaseColumns: Column<Lease>[] = [
    {
      id: "lease",
      header: "Lease",
      cell: (row) => <IdentifierCell value={row.leaseId} label="lease id" />,
      sortValue: (row) => row.leaseId,
    },
    {
      id: "installation",
      header: "Installation",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.installationId}</code>,
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
      cell: (row) => <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "keyId",
      header: "Signing key",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.keyId}</code>,
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
        title={record?.key ?? "Licence"}
        description="Leases are short-lived and signed; suspending or revoking a licence takes effect when the installation next renews or immediately if it is online."
        meta={record ? <StatusBadge status={record.status} /> : undefined}
        actions={
          <Permitted permission="licensing:write">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending("suspend")}>
                Suspend
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
          label="Installations"
          value={record ? `${record.installations} / ${record.maxInstallations}` : "—"}
          tone={record && record.installations >= record.maxInstallations ? "warn" : "neutral"}
          isLoading={license.isLoading}
        />
        <MetricCard
          label="Remaining validity"
          value={record ? `${Math.max(0, daysUntil(record.expiresAt))} days` : "—"}
          tone={record && daysUntil(record.expiresAt) <= 30 ? "warn" : "ok"}
          isLoading={license.isLoading}
        />
        <MetricCard
          label="Active leases"
          value={issued.filter((row) => row.status === "valid").length}
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Last validation"
          value={record ? formatRelative(record.lastValidationAt) : "—"}
          isLoading={license.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold">Licence record</h3>
          <dl className="mt-2">
            <StatRow label="Customer" value={record?.customerName ?? "—"} />
            <StatRow label="Product" value={record?.productName ?? "—"} />
            <StatRow label="Plan" value={record?.plan ?? "—"} />
            <StatRow
              label="Validity"
              value={record ? `${formatDate(record.startsAt)} → ${formatDate(record.expiresAt)}` : "—"}
            />
            <StatRow
              label="Licence key"
              value={record ? <IdentifierCell value={record.key} label="licence key" /> : "—"}
            />
          </dl>
        </section>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Entitled features</h3>
          <ul className="mt-2 space-y-1">
            {(record?.features ?? []).map((feature) => (
              <li key={feature} className="flex items-center justify-between gap-2 text-sm">
                <code className="mono-xs">{feature}</code>
                <StatusBadge status="active" label="granted" />
              </li>
            ))}
            {(record?.features.length ?? 0) === 0 && !license.isLoading && (
              <li className="text-xs text-muted-foreground">No feature flags attached to this plan.</li>
            )}
          </ul>
        </section>
      </div>

      <Tabs defaultValue="installations">
        <TabsList>
          <TabsTrigger value="installations">Installations</TabsTrigger>
          <TabsTrigger value="leases">Leases</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>
        <TabsContent value="installations" className="mt-4 space-y-3">
          <SectionTitle title="Bound installations" description="Each installation consumes one seat." />
          <DataTable
            data={bound}
            columns={installationColumns}
            rowKey={(row) => row.id}
            isLoading={installations.isLoading}
            error={installations.error ?? undefined}
            dense
          />
        </TabsContent>
        <TabsContent value="leases" className="mt-4 space-y-3">
          <SectionTitle title="Issued leases" description="Signed, short-lived authorisations to run." />
          <DataTable
            data={issued}
            columns={leaseColumns}
            rowKey={(row) => row.id}
            isLoading={leases.isLoading}
            error={leases.error ?? undefined}
            dense
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline items={timeline} />
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === "revoke" ? "Revoke licence" : "Suspend licence"}
        warning={
          pending === "revoke"
            ? "Revocation is permanent. Every bound installation stops receiving leases and the licence key can never be reactivated."
            : "Suspension blocks new lease issuance. Installations keep running until their current lease expires."
        }
        details={
          record
            ? [
                { label: "Licence", value: record.key },
                { label: "Customer", value: record.customerName },
                { label: "Installations", value: `${record.installations}` },
              ]
            : undefined
        }
        confirmLabel={pending === "revoke" ? "Revoke licence" : "Suspend licence"}
        requireTypedValue={pending === "revoke" ? record?.key : undefined}
        environmentNotice="The backend re-verifies authorisation and records the operation in the audit trail."
        onConfirm={async () => {
          if (!record || !pending) return;
          await action.mutateAsync({
            action: pending === "revoke" ? "license.revoke" : "license.suspend",
            resourceId: record.id,
          });
          setPending(null);
        }}
      />
    </div>
  );
}
