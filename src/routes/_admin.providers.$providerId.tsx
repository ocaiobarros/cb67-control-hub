import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { MaskedSecret } from "@/components/common/copy-button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatCompact, formatMs, formatNumber, formatPercent, formatRelative } from "@/utils/format";
import type { CredentialMetadata, Provider, ProviderProject, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/providers/$providerId")({
  head: ({ params }) => {
    const name = params.providerId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `${name} Integration — CB67 Labs Control Center` },
        {
          name: "description",
          content: `Upstream health, projects, quota pressure and credential rotation state for the ${name} integration.`,
        },
        { property: "og:title", content: `${name} Integration — CB67 Labs Control Center` },
        {
          property: "og:description",
          content: `Traffic, latency and credential posture for ${name}.`,
        },
      ],
    };
  },
  component: ProviderDetail,
});

function ProviderDetail() {
  const { providerId } = Route.useParams();
  const id = providerId as Provider["id"];
  const [range, setRange] = useState<TimeRange>("24h");
  const providers = useQuery(q.providers());
  const projects = useQuery(q.providerProjects(id));
  const credentials = useQuery(q.credentials(id));
  const series = useQuery(q.providerSeries(id, range));
  const action = useAdminAction();
  const [rotating, setRotating] = useState<CredentialMetadata | null>(null);

  const provider = (providers.data ?? []).find((row) => row.id === id);

  if (!providers.isLoading && !provider) {
    return (
      <div className="space-y-6">
        <PageHeader title="Provider not found" description="No integration is registered for this identifier." />
        <EmptyState
          message="Unknown provider"
          hint="Supported integrations are OpenAI, Gemini and Google Maps."
        />
      </div>
    );
  }

  const projectColumns: Column<ProviderProject>[] = [
    {
      id: "project",
      header: "Project",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.project}</code>
          <p className="text-xs text-muted-foreground">{row.applicationName}</p>
        </div>
      ),
      sortValue: (row) => row.project,
    },
    {
      id: "environment",
      header: "Environment",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "credential",
      header: "Credential",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.credentialAlias}</code>,
    },
    {
      id: "requests",
      header: "Requests 24h",
      cell: (row) => <span className="tabular">{formatCompact(row.requests24h)}</span>,
      sortValue: (row) => row.requests24h,
      align: "right",
    },
    {
      id: "throttled",
      header: "Rate limited",
      cell: (row) => (
        <span className={row.rateLimited24h > 0 ? "tabular text-warn" : "tabular"}>
          {formatNumber(row.rateLimited24h)}
        </span>
      ),
      sortValue: (row) => row.rateLimited24h,
      align: "right",
    },
    {
      id: "quota",
      header: "Quota usage",
      cell: (row) => (
        <span className={row.quotaUsage > 85 ? "tabular text-crit" : "tabular"}>
          {formatPercent(row.quotaUsage, 1)}
        </span>
      ),
      sortValue: (row) => row.quotaUsage,
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

  const credentialColumns: Column<CredentialMetadata>[] = [
    {
      id: "alias",
      header: "Alias",
      cell: (row) => <code className="mono-xs text-foreground">{row.alias}</code>,
      sortValue: (row) => row.alias,
    },
    { id: "secret", header: "Secret", cell: () => <MaskedSecret /> },
    {
      id: "application",
      header: "Application",
      cell: (row) => <span className="text-sm">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
    },
    {
      id: "rotated",
      header: "Last rotated",
      cell: (row) => <span className="mono-xs">{formatRelative(row.lastRotatedAt)}</span>,
      sortValue: (row) => row.lastRotatedAt,
      align: "right",
    },
    {
      id: "used",
      header: "Last used",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastUsedAt)}</span>
      ),
      sortValue: (row) => row.lastUsedAt,
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
        <Permitted permission="providers:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setRotating(row);
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
        title={provider?.name ?? "Provider"}
        description="All calls to this provider are brokered by the platform. Credentials are stored server-side and only their metadata is exposed here."
        meta={provider ? <StatusBadge status={provider.status} /> : undefined}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests 24h"
          value={provider ? formatCompact(provider.requests24h) : "—"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Errors 24h"
          value={provider ? formatNumber(provider.errors24h) : "—"}
          tone={provider && provider.errors24h > 0 ? "warn" : "ok"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Upstream p95"
          value={provider ? formatMs(provider.p95Ms) : "—"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Last success"
          value={provider ? formatRelative(provider.lastSuccessAt) : "—"}
          isLoading={providers.isLoading}
        />
      </div>

      <ChartPanel
        title="Upstream latency"
        description="Measured at the outbound call boundary, excluding platform processing."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={(series.data?.length ?? 0) === 0}
        height={240}
      >
        <TimeSeriesChart
          data={series.data ?? []}
          series={[{ key: "value", label: "Provider latency" }]}
          variant="line"
          unit="ms"
        />
      </ChartPanel>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects</TabsTrigger>
          <TabsTrigger value="credentials">Credentials</TabsTrigger>
          <TabsTrigger value="policy">Policy</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-3">
          <SectionTitle
            title="Provider projects"
            description="Each SaaS environment maps to an isolated upstream project."
          />
          <DataTable
            data={projects.data}
            columns={projectColumns}
            rowKey={(row) => row.id}
            isLoading={projects.isLoading}
            error={projects.error ?? undefined}
            searchPlaceholder="Search project or application…"
            searchValue={(row) => `${row.project} ${row.applicationName}`}
            pageSize={10}
          />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4 space-y-3">
          <SectionTitle
            title="Credential metadata"
            description="Rotation is submitted as an operation; the backend performs the exchange and invalidates the previous secret."
          />
          <DataTable
            data={credentials.data}
            columns={credentialColumns}
            rowKey={(row) => row.id}
            isLoading={credentials.isLoading}
            error={credentials.error ?? undefined}
            pageSize={10}
          />
        </TabsContent>

        <TabsContent value="policy" className="mt-4">
          <section className="panel p-4">
            <h3 className="text-sm font-semibold">Integration policy</h3>
            <dl className="mt-2">
              <StatRow label="Credential ownership" value="Platform only — never exposed to consumers" />
              <StatRow label="Failure isolation" value="Provider errors excluded from platform SLO" />
              <StatRow label="Retry strategy" value="Backend controlled (provisional)" />
              <StatRow label="Projects" value={provider?.projects ?? "—"} />
              <StatRow label="Credentials" value={provider?.credentials ?? "—"} />
            </dl>
          </section>
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={rotating !== null}
        onOpenChange={(open) => {
          if (!open) setRotating(null);
        }}
        title="Rotate provider credential"
        warning="A new secret is issued and the previous one is invalidated. Consumers do not need changes because the platform brokers every call, but in-flight upstream sessions may fail once."
        details={
          rotating
            ? [
                { label: "Alias", value: rotating.alias },
                { label: "Application", value: rotating.applicationName },
                { label: "Environment", value: rotating.environment },
              ]
            : undefined
        }
        confirmLabel="Rotate credential"
        requireTypedValue={rotating?.alias}
        environmentNotice="The operation is authorised and audited server-side."
        onConfirm={async () => {
          if (!rotating) return;
          await action.mutateAsync({ action: "provider-credential.rotate", resourceId: rotating.id });
          setRotating(null);
        }}
      />
    </div>
  );
}
