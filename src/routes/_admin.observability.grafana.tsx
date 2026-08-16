import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { StatRow } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { env, platformMeta } from "@/config/env";

export const Route = createFileRoute("/_admin/observability/grafana")({
  head: () => ({
    meta: [
      { title: "Grafana — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Entry points to the CB67 Labs Grafana instance for deep-dive dashboards that live outside the Control Center.",
      },
      { property: "og:title", content: "Grafana — CB67 Labs Control Center" },
      { property: "og:description", content: "Deep-dive dashboards hosted on the management network." },
    ],
  }),
  component: GrafanaPage,
});

const DASHBOARDS = [
  {
    slug: "platform-overview",
    name: "Platform overview",
    description: "Golden signals for the API gateway, licensing service and supporting components.",
  },
  {
    slug: "api-performance",
    name: "API performance",
    description: "Per-endpoint latency percentiles, throughput and error budget burn.",
  },
  {
    slug: "provider-integrations",
    name: "Provider integrations",
    description: "Upstream latency, throttling and failure attribution per external provider.",
  },
  {
    slug: "infrastructure",
    name: "Infrastructure",
    description: "Proxmox node CPU, memory, storage and network saturation.",
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    description: "Connections, transaction throughput, cache hit ratio and lock contention.",
  },
];

function GrafanaPage() {
  const base = env.grafanaUrl;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grafana"
        description="Long-range analysis and ad-hoc exploration stay in Grafana on the management network. The Control Center links out rather than embedding queries."
        actions={
          base ? (
            <Button asChild size="sm" variant="outline">
              <a href={base} target="_blank" rel="noreferrer noopener">
                Open Grafana
                <ExternalLink className="ml-1 size-3.5" aria-hidden />
              </a>
            </Button>
          ) : undefined
        }
      />

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Instance</h3>
        <dl className="mt-2">
          <StatRow label="Expected host" value={platformMeta.grafanaDomain} />
          <StatRow
            label="Configured URL"
            value={base ? <code className="mono-xs">{base}</code> : "Not configured"}
          />
          <StatRow label="Configuration key" value={<code className="mono-xs">VITE_GRAFANA_URL</code>} />
          <StatRow label="Network" value="Management network only; not published to the internet" />
        </dl>
      </section>

      {!base ? (
        <EmptyState
          message="Grafana URL is not configured"
          hint="Set VITE_GRAFANA_URL in the deployment environment to enable the dashboard links below."
        />
      ) : null}

      <div className="space-y-3">
        <SectionTitle
          title="Reference dashboards"
          description="Slugs are provisional and must match the dashboards provisioned on the Grafana instance."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {DASHBOARDS.map((dashboard) => (
            <div key={dashboard.slug} className="panel flex flex-col gap-2 p-4">
              <div>
                <p className="text-sm font-medium">{dashboard.name}</p>
                <code className="mono-xs text-muted-foreground">{dashboard.slug}</code>
              </div>
              <p className="flex-1 text-xs text-muted-foreground">{dashboard.description}</p>
              {base ? (
                <Button asChild size="sm" variant="outline" className="self-start">
                  <a
                    href={`${base.replace(/\/$/, "")}/d/${dashboard.slug}`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Open
                    <ExternalLink className="ml-1 size-3.5" aria-hidden />
                  </a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Link unavailable</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
