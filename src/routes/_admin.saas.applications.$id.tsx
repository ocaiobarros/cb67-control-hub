import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, type Column } from "@/components/common/data-table";
import { IdentifierCell } from "@/components/common/copy-button";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline } from "@/components/common/activity-timeline";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCompact,
  formatDateTime,
  formatMs,
  formatNumber,
  formatPercent,
  formatRelative,
} from "@/utils/format";
import type { Instance } from "@/types";

export const Route = createFileRoute("/_admin/saas/applications/$id")({
  head: () => ({
    meta: [
      { title: "Application Detail — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Credentials, scopes, quotas, instances and audit history for a single SaaS application registered on the CB67 Labs platform.",
      },
      { property: "og:title", content: "Application Detail — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Credentials, scopes, quotas, instances and audit history.",
      },
    ],
  }),
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const application = useQuery(q.application(id));
  const instances = useQuery(q.instances(id));
  const audit = useQuery(q.auditEvents());
  const action = useAdminAction();
  const [pending, setPending] = useState<null | "suspend" | "rotate">(null);

  if (application.isError) {
    return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;
  }

  const app = application.data;

  const instanceColumns: Column<Instance>[] = [
    {
      id: "installation",
      header: "Installation",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    { id: "host", header: "Host", cell: (row) => <span className="text-sm">{row.hostLabel}</span>, sortValue: (row) => row.hostLabel },
    { id: "version", header: "Version", cell: (row) => <span className="mono-xs">{row.version}</span>, sortValue: (row) => row.version },
    {
      id: "certificate",
      header: "Certificate",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
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
      align: "right",
    },
  ];

  const timeline = (audit.data ?? [])
    .filter((event) => !app || event.resourceId === app.apiClientId || event.resource === "application")
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: `${event.action} · ${event.resource}`,
      detail: `${event.actor} from ${event.source}`,
      status: event.result,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={app?.name ?? "Application"}
        description="Consolidated view of a SaaS consumer: identity, authorised scopes, quota consumption, deployed instances and recorded activity."
        meta={
          app ? (
            <>
              <StatusBadge status={app.status} />
              <Badge variant="outline" className="mono-xs">
                {app.environment}
              </Badge>
            </>
          ) : null
        }
        actions={
          <Permitted permission="saas.write">
            <Button variant="outline" size="sm" onClick={() => setPending("rotate")}>
              Rotate credential
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setPending("suspend")}>
              Suspend access
            </Button>
          </Permitted>
        }
      />

      {application.isLoading || !app ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Requests 30d" value={formatCompact(app.requests30d)} />
            <MetricCard
              label="Error rate"
              value={formatPercent(app.errorRate)}
              tone={app.errorRate > 1 ? "warn" : "ok"}
              hint={`${formatNumber(app.errors30d)} failed requests`}
            />
            <MetricCard label="p95 / p99" value={`${formatMs(app.p95Ms)} / ${formatMs(app.p99Ms)}`} />
            <MetricCard
              label="Rate limited"
              value={formatNumber(app.rateLimited)}
              hint="429 responses in 30 days"
            />
          </div>

          <Tabs defaultValue="identity">
            <TabsList>
              <TabsTrigger value="identity">Identity</TabsTrigger>
              <TabsTrigger value="quotas">Quotas</TabsTrigger>
              <TabsTrigger value="instances">Instances</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="grid gap-3 lg:grid-cols-2">
              <section className="panel p-4">
                <h2 className="pb-2 text-sm font-semibold">Client identity</h2>
                <dl>
                  <StatRow
                    label="API client ID"
                    value={<IdentifierCell value={app.apiClientId} label="client id" />}
                  />
                  <StatRow label="Application code" value={<code className="mono-xs">{app.code}</code>} />
                  <StatRow label="License status" value={<StatusBadge status={app.licenseStatus} />} />
                  <StatRow
                    label="Certificate"
                    value={
                      <span className="flex items-center gap-2">
                        <StatusBadge status={app.certificateStatus} />
                        <span className="mono-xs text-muted-foreground">
                          exp. {formatDateTime(app.certificateExpiresAt)}
                        </span>
                      </span>
                    }
                  />
                  <StatRow label="Last seen" value={formatRelative(app.lastSeen)} />
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Client secrets and private keys are never displayed. Rotation issues new material
                  through the platform PKI and invalidates the previous credential.
                </p>
              </section>

              <section className="panel p-4">
                <h2 className="pb-2 text-sm font-semibold">Service authorisation</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Allowed
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {app.allowedServices.map((service) => (
                        <Badge key={service} variant="outline" className="mono-xs border-ok/40 text-ok">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Blocked
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {app.blockedServices.length === 0 ? (
                        <span className="text-xs text-muted-foreground">No explicit denials.</span>
                      ) : (
                        app.blockedServices.map((service) => (
                          <Badge key={service} variant="outline" className="mono-xs border-crit/40 text-crit">
                            {service}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="quotas" className="grid gap-3 sm:grid-cols-2">
              <UsageCard
                label="Monthly quota"
                used={app.quotaUsed}
                total={app.monthlyQuota}
                formatValue={formatCompact}
                hint="Requests consumed in the current billing window"
              />
              <MetricCard
                label="Rate limited"
                value={formatNumber(app.rateLimited)}
                tone={app.rateLimited > 0 ? "warn" : "ok"}
                hint="Requests rejected with 429"
              />
            </TabsContent>

            <TabsContent value="instances">
              <DataTable
                data={instances.data}
                columns={instanceColumns}
                rowKey={(row) => row.id}
                isLoading={instances.isLoading}
                error={instances.error ?? undefined}
                searchPlaceholder="Search installations…"
                emptyMessage="No instances reporting for this application."
              />
            </TabsContent>

            <TabsContent value="activity" className="panel p-4">
              <ActivityTimeline items={timeline} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <ConfirmActionDialog
        open={pending === "suspend"}
        onOpenChange={(open) => setPending(open ? "suspend" : null)}
        title="Suspend application access"
        warning="The application will immediately receive 403 responses on every endpoint. Running instances stop functioning until access is restored."
        details={[
          { label: "Application", value: app?.name ?? "—" },
          { label: "Client ID", value: <code className="mono-xs">{app?.apiClientId}</code> },
          { label: "Instances affected", value: app?.instances ?? 0 },
        ]}
        environmentNotice={
          app?.environment === "production"
            ? "This application runs in PRODUCTION. Confirm the change window before proceeding."
            : undefined
        }
        requireTypedValue={app?.code}
        confirmLabel="Suspend access"
        onConfirm={async () => {
          await action.mutateAsync({ action: "saas.suspend", resourceId: id });
        }}
      />

      <ConfirmActionDialog
        open={pending === "rotate"}
        onOpenChange={(open) => setPending(open ? "rotate" : null)}
        title="Rotate client credential"
        warning="A new credential is issued and the current one is invalidated after the grace period defined by platform policy. Instances must pick up the new material."
        details={[
          { label: "Application", value: app?.name ?? "—" },
          { label: "Client ID", value: <code className="mono-xs">{app?.apiClientId}</code> },
        ]}
        destructive={false}
        confirmLabel="Rotate credential"
        onConfirm={async () => {
          await action.mutateAsync({ action: "saas.rotate-credential", resourceId: id });
        }}
      />
    </div>
  );
}
