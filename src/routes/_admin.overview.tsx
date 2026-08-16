import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { ErrorState } from "@/components/common/error-state";
import {
  CategoryBarChart,
  ChartPanel,
  DonutChart,
  TimeSeriesChart,
} from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { Progress } from "@/components/ui/progress";
import { formatCompact, formatMs, formatNumber, formatPercent } from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/overview")({
  head: () => ({
    meta: [
      { title: "Platform Overview — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Executive technical overview of the CB67 Labs platform: traffic, latency, error budget, licensing and infrastructure health.",
      },
      { property: "og:title", content: "Platform Overview — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Traffic, latency, error rate, licensing and infrastructure health at a glance.",
      },
    ],
  }),
  component: OverviewPage,
});

function OverviewPage() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.overview(range));
  const data = overview.data;

  if (overview.isError) {
    return <ErrorState error={overview.error} onRetry={() => void overview.refetch()} />;
  }

  const errorTone = !data ? "neutral" : data.errorRate > 2 ? "crit" : data.errorRate > 1 ? "warn" : "ok";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        description="Consolidated technical state of the platform: request volume, latency distribution, error budget, licensing and node health."
        meta={data ? <StatusBadge status={data.platformHealth} /> : null}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requests"
          value={data ? formatCompact(data.requests) : "—"}
          hint={data ? `${formatNumber(Math.round(data.rps))} req/s current` : undefined}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Latency p95 / p99"
          value={data ? `${formatMs(data.p95)} / ${formatMs(data.p99)}` : "—"}
          hint="Gateway ingress to response"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Error rate"
          value={data ? formatPercent(data.errorRate) : "—"}
          tone={errorTone}
          hint="5xx over total requests"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Active licenses"
          value={data ? formatNumber(data.activeLicenses) : "—"}
          hint={data ? `${data.activeSaas} SaaS applications online` : undefined}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPanel
            title="Request volume"
            description="Total requests handled by the API gateway in the selected window."
            isLoading={overview.isLoading}
            isEmpty={data?.charts.requests.length === 0}
            height={260}
          >
            <TimeSeriesChart
              data={data?.charts.requests ?? []}
              series={[{ key: "requests", label: "Requests" }]}
            />
          </ChartPanel>
        </div>
        <ChartPanel
          title="Rejections & errors"
          description="Responses by status code, excluding successful traffic."
          isLoading={overview.isLoading}
          isEmpty={data?.statusCounts.length === 0}
          height={260}
        >
          <DonutChart data={(data?.statusCounts ?? []).map((s) => ({ t: s.code, value: s.value }))} />
        </ChartPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Latency percentiles"
          description="p50, p95 and p99 in milliseconds."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.latency.length === 0}
        >
          <TimeSeriesChart
            variant="line"
            unit="ms"
            data={data?.charts.latency ?? []}
            series={[
              { key: "p50", label: "p50" },
              { key: "p95", label: "p95" },
              { key: "p99", label: "p99" },
            ]}
          />
        </ChartPanel>
        <ChartPanel
          title="Requests by SaaS application"
          description="Top consumers in the selected window."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.requestsBySaas.length === 0}
        >
          <CategoryBarChart data={data?.charts.requestsBySaas ?? []} layout="horizontal" colorByIndex />
        </ChartPanel>
      </div>

      <section className="space-y-3">
        <SectionTitle
          title="Node resources"
          description="Aggregated utilisation across on-premises hosts."
          actions={
            <AppLink
              to="/infrastructure/hosts"
              className="text-xs font-medium text-primary hover:underline"
            >
              Inspect hosts →
            </AppLink>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              ["CPU", data?.resources.cpu],
              ["Memory", data?.resources.memory],
              ["Storage", data?.resources.storage],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="panel space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular text-muted-foreground">
                  {value === undefined ? "—" : formatPercent(value, 1)}
                </span>
              </div>
              <Progress value={value ?? 0} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Core services"
          description="Health reported by the platform control plane."
          actions={
            <AppLink
              to="/infrastructure/services"
              className="text-xs font-medium text-primary hover:underline"
            >
              All services →
            </AppLink>
          }
        />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {(data?.services ?? []).slice(0, 6).map((service) => (
            <div key={service.id} className="panel flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{service.name}</p>
                <p className="mono-xs truncate text-muted-foreground">{service.detail}</p>
              </div>
              <StatusBadge status={service.status} />
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Licenses by status"
          description="Active, grace, expired, suspended and revoked."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.licensesByStatus.length === 0}
        >
          <CategoryBarChart data={data?.charts.licensesByStatus ?? []} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Provider latency"
          description="Average upstream latency per external provider."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.providerLatency.length === 0}
        >
          <CategoryBarChart data={data?.charts.providerLatency ?? []} layout="horizontal" colorByIndex />
        </ChartPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Auth failures"
          value={data ? formatNumber(data.authFailures) : "—"}
          tone={data && data.authFailures > 200 ? "warn" : "neutral"}
          hint="Invalid credentials, tokens and mTLS"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Rate limited"
          value={data ? formatNumber(data.rateLimited) : "—"}
          hint="429 responses in window"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Providers degraded"
          value={data ? formatNumber(data.providers.filter((p) => p.status !== "healthy").length) : "—"}
          tone={data && data.providers.some((p) => p.status === "unavailable") ? "crit" : "neutral"}
          hint="External dependencies"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Active SaaS"
          value={data ? formatNumber(data.activeSaas) : "—"}
          hint="Applications consuming the API"
          isLoading={overview.isLoading}
        />
      </div>
    </div>
  );
}
