import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { formatCompact, formatNumber, formatPercent } from "@/utils/format";
import type { RateLimitRule } from "@/types";

export const Route = createFileRoute("/_admin/apis/rate-limits")({
  head: () => ({
    meta: [
      { title: "Rate Limits — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Per-application rate limit policies with requests per second, per minute and daily ceilings, plus throttling headroom.",
      },
      { property: "og:title", content: "Rate Limits — CB67 Labs Control Center" },
      { property: "og:description", content: "Throttling policy, current usage and headroom." },
    ],
  }),
  component: RateLimitsPage,
});

function RateLimitsPage() {
  const rateLimits = useQuery(q.rateLimits());
  const action = useAdminAction();
  const [target, setTarget] = useState<RateLimitRule | null>(null);

  const rows = rateLimits.data ?? [];
  const throttled = rows.reduce((sum, row) => sum + row.rateLimited, 0);
  const atRisk = rows.filter((row) => row.headroom < 20);

  const chart = [...rows]
    .sort((a, b) => b.rateLimited - a.rateLimited)
    .slice(0, 8)
    .map((row) => ({ t: row.applicationName, value: row.rateLimited }));

  const columns: Column<RateLimitRule>[] = [
    {
      id: "application",
      header: "Application",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.applicationName}</p>
          <code className="mono-xs text-muted-foreground">{row.api}</code>
        </div>
      ),
      sortValue: (row) => row.applicationName,
    },
    {
      id: "rps",
      header: "RPS",
      cell: (row) => <span className="tabular">{formatNumber(row.rps)}</span>,
      sortValue: (row) => row.rps,
      align: "right",
    },
    {
      id: "rpm",
      header: "RPM",
      cell: (row) => <span className="tabular">{formatNumber(row.rpm)}</span>,
      sortValue: (row) => row.rpm,
      align: "right",
    },
    {
      id: "daily",
      header: "Daily",
      cell: (row) => <span className="tabular">{formatCompact(row.daily)}</span>,
      sortValue: (row) => row.daily,
      align: "right",
    },
    {
      id: "usage",
      header: "Peak usage",
      cell: (row) => <span className="tabular">{formatPercent(row.currentUsage, 1)}</span>,
      sortValue: (row) => row.currentUsage,
      align: "right",
    },
    {
      id: "rateLimited",
      header: "Throttled 24h",
      cell: (row) => (
        <span className={row.rateLimited > 0 ? "tabular text-warn" : "tabular"}>
          {formatNumber(row.rateLimited)}
        </span>
      ),
      sortValue: (row) => row.rateLimited,
      align: "right",
    },
    {
      id: "headroom",
      header: "Headroom",
      cell: (row) => (
        <span className={row.headroom < 20 ? "tabular text-crit" : "tabular text-ok"}>
          {formatPercent(row.headroom, 0)}
        </span>
      ),
      sortValue: (row) => row.headroom,
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
        <Permitted permission="apis:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Reset counters
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Rate Limits"
        description="Policies are enforced at the gateway per application and API. This surface reflects the configured ceilings; changes are submitted as operations and applied by the backend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Policies" value={rows.length} isLoading={rateLimits.isLoading} />
        <MetricCard
          label="Throttled requests 24h"
          value={formatCompact(throttled)}
          tone={throttled > 0 ? "warn" : "ok"}
          isLoading={rateLimits.isLoading}
        />
        <MetricCard
          label="Below 20% headroom"
          value={atRisk.length}
          tone={atRisk.length > 0 ? "crit" : "ok"}
          hint="Candidates for a ceiling review"
          isLoading={rateLimits.isLoading}
        />
        <MetricCard
          label="Aggregate RPS ceiling"
          value={formatNumber(rows.reduce((sum, row) => sum + row.rps, 0))}
          isLoading={rateLimits.isLoading}
        />
      </div>

      <ChartPanel
        title="Throttling by application"
        description="Requests rejected with 429 in the last 24 hours."
        isLoading={rateLimits.isLoading}
        error={rateLimits.error ?? undefined}
        isEmpty={chart.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={chart} layout="horizontal" />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Configured policies"
          description="Ceilings apply per application and API pair."
        />
        <DataTable
          data={rateLimits.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={rateLimits.isLoading}
          error={rateLimits.error ?? undefined}
          searchPlaceholder="Search application or API…"
          searchValue={(row) => `${row.applicationName} ${row.api}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Reset rate limit counters"
        warning="The current window counters are cleared for this policy. In-flight throttling stops immediately and consumers regain full burst capacity."
        details={
          target
            ? [
                { label: "Application", value: target.applicationName },
                { label: "API", value: target.api },
                { label: "Throttled 24h", value: formatNumber(target.rateLimited) },
              ]
            : undefined
        }
        confirmLabel="Reset counters"
        environmentNotice="Operations are recorded in the audit trail and re-authorised server-side."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "rate-limit.reset", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
