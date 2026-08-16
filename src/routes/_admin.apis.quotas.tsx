import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, UsageCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatCompact, formatDate, formatNumber, formatPercent } from "@/utils/format";
import type { QuotaRecord } from "@/types";

export const Route = createFileRoute("/_admin/apis/quotas")({
  head: () => ({
    meta: [
      { title: "API Quotas — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Monthly API quota consumption per application with end-of-cycle forecast and reset dates.",
      },
      { property: "og:title", content: "API Quotas — CB67 Labs Control Center" },
      { property: "og:description", content: "Consumption, forecast and reset per application." },
    ],
  }),
  component: QuotasPage,
});

function usagePct(row: QuotaRecord) {
  return row.monthlyQuota > 0 ? (row.used / row.monthlyQuota) * 100 : 0;
}

function forecastTone(row: QuotaRecord) {
  const pct = row.monthlyQuota > 0 ? (row.forecast / row.monthlyQuota) * 100 : 0;
  if (pct >= 100) return "crit" as const;
  if (pct >= 85) return "warn" as const;
  return "ok" as const;
}

function QuotasPage() {
  const quotas = useQuery(q.quotas());
  const rows = quotas.data ?? [];

  const totalQuota = rows.reduce((sum, row) => sum + row.monthlyQuota, 0);
  const totalUsed = rows.reduce((sum, row) => sum + row.used, 0);
  const overForecast = rows.filter((row) => row.forecast > row.monthlyQuota);
  const top = [...rows].sort((a, b) => usagePct(b) - usagePct(a)).slice(0, 3);

  const columns: Column<QuotaRecord>[] = [
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
      id: "rate",
      header: "Rate / min",
      cell: (row) => <span className="tabular">{formatNumber(row.rateLimitPerMin)}</span>,
      sortValue: (row) => row.rateLimitPerMin,
      align: "right",
    },
    {
      id: "quota",
      header: "Monthly quota",
      cell: (row) => <span className="tabular">{formatCompact(row.monthlyQuota)}</span>,
      sortValue: (row) => row.monthlyQuota,
      align: "right",
    },
    {
      id: "used",
      header: "Used",
      cell: (row) => (
        <div className="text-right">
          <span className="tabular">{formatCompact(row.used)}</span>
          <p className="mono-xs text-muted-foreground">{formatPercent(usagePct(row), 1)}</p>
        </div>
      ),
      sortValue: (row) => usagePct(row),
      align: "right",
    },
    {
      id: "forecast",
      header: "Cycle forecast",
      cell: (row) => (
        <span
          className={
            forecastTone(row) === "crit"
              ? "tabular text-crit"
              : forecastTone(row) === "warn"
                ? "tabular text-warn"
                : "tabular"
          }
        >
          {formatCompact(row.forecast)}
        </span>
      ),
      sortValue: (row) => row.forecast,
      align: "right",
    },
    {
      id: "status",
      header: "Projection",
      cell: (row) => (
        <StatusBadge
          status={forecastTone(row) === "crit" ? "critical" : forecastTone(row) === "warn" ? "warn" : "healthy"}
          label={forecastTone(row) === "crit" ? "Will exceed" : forecastTone(row) === "warn" ? "Near limit" : "Within quota"}
        />
      ),
      sortValue: (row) => row.forecast / Math.max(1, row.monthlyQuota),
      align: "right",
    },
    {
      id: "resets",
      header: "Resets",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDate(row.resetsAt)}</span>,
      sortValue: (row) => row.resetsAt,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="API Quotas"
        description="Quotas are counted per billing cycle and evaluated independently from rate limits. Forecast projects the current burn rate to the end of the cycle."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Tracked pairs" value={rows.length} isLoading={quotas.isLoading} />
        <MetricCard
          label="Consumed"
          value={formatCompact(totalUsed)}
          hint={`of ${formatCompact(totalQuota)} granted`}
          isLoading={quotas.isLoading}
        />
        <MetricCard
          label="Cycle utilisation"
          value={formatPercent(totalQuota > 0 ? (totalUsed / totalQuota) * 100 : 0, 1)}
          isLoading={quotas.isLoading}
        />
        <MetricCard
          label="Forecast breaches"
          value={overForecast.length}
          tone={overForecast.length > 0 ? "crit" : "ok"}
          hint="Applications projected above quota"
          isLoading={quotas.isLoading}
        />
      </div>

      {top.length > 0 && (
        <div className="grid gap-3 md:grid-cols-3">
          {top.map((row) => (
            <UsageCard
              key={row.id}
              label={row.applicationName}
              used={row.used}
              total={row.monthlyQuota}
              formatValue={formatCompact}
              hint={`${row.api} · resets ${formatDate(row.resetsAt)}`}
            />
          ))}
        </div>
      )}

      <div className="space-y-3">
        <SectionTitle
          title="Quota ledger"
          description="Sorted client-side; the backend owns cycle boundaries and carry-over rules."
        />
        <DataTable
          data={quotas.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={quotas.isLoading}
          error={quotas.error ?? undefined}
          searchPlaceholder="Search application or API…"
          searchValue={(row) => `${row.applicationName} ${row.api}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
