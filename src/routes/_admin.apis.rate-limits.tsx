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
      { title: "Limites de Taxa — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Políticas de limite de taxa por aplicação com tetos de requisições por segundo, por minuto e diários, além da margem de limitação.",
      },
      { property: "og:title", content: "Limites de Taxa — CB67 Labs Control Center" },
      { property: "og:description", content: "Política de limitação, uso atual e margem." },
    ],
  }),
  component: RateLimitsPage,
});

function RateLimitsPage() {
  const rateLimits = useQuery(q.rateLimits());
  const action = useAdminAction();
  const [target, setTarget] = useState<RateLimitRule | null>(null);

  const rows = rateLimits.data ?? [];

  // Rules OVERLAP: a request on one surface counts towards that surface's rule
  // and towards the application's wildcard rule. Summing rateLimited across
  // rows therefore counted a single rejection once per matching rule.
  //
  // One row per application: the wildcard already covers everything, so it is
  // the whole figure where it exists. Where it does not, the specific rules do
  // not overlap each other and can be summed.
  const perApplication = new Map<string, number>();
  for (const row of rows) {
    const current = perApplication.get(row.applicationName);
    if (row.api === "*") {
      perApplication.set(row.applicationName, row.rateLimited);
    } else if (current === undefined) {
      perApplication.set(row.applicationName, row.rateLimited);
    } else if (!rows.some((r) => r.applicationName === row.applicationName && r.api === "*")) {
      perApplication.set(row.applicationName, current + row.rateLimited);
    }
  }

  const throttled = [...perApplication.values()].reduce((sum, n) => sum + n, 0);
  const atRisk = rows.filter((row) => row.headroom < 20);

  const chart = [...perApplication.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([applicationName, rateLimited]) => ({ t: applicationName, value: rateLimited }));

  const columns: Column<RateLimitRule>[] = [
    {
      id: "application",
      header: "Aplicação",
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
      header: "Diário",
      cell: (row) => <span className="tabular">{formatCompact(row.daily)}</span>,
      sortValue: (row) => row.daily,
      align: "right",
    },
    {
      id: "usage",
      header: "Uso 24h",
      cell: (row) => <span className="tabular">{formatPercent(row.currentUsage, 1)}</span>,
      sortValue: (row) => row.currentUsage,
      align: "right",
    },
    {
      id: "rateLimited",
      header: "Limitado 24h",
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
      header: "Margem",
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
        <Permitted permission="apis.write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Reiniciar contadores
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Limites de Taxa"
        description="As políticas são aplicadas no gateway por aplicação e API. Esta superfície reflete os tetos configurados; alterações são enviadas como operações e aplicadas pelo backend."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Políticas" value={rows.length} isLoading={rateLimits.isLoading} />
        <MetricCard
          label="Requisições limitadas 24h"
          value={formatCompact(throttled)}
          tone={throttled > 0 ? "warn" : "ok"}
          isLoading={rateLimits.isLoading}
        />
        <MetricCard
          label="Abaixo de 20% de margem"
          value={atRisk.length}
          tone={atRisk.length > 0 ? "crit" : "ok"}
          hint="Candidatos a revisão de teto"
          isLoading={rateLimits.isLoading}
        />
        <MetricCard
          label="Teto agregado de RPS"
          value={formatNumber(rows.reduce((sum, row) => sum + row.rps, 0))}
          isLoading={rateLimits.isLoading}
        />
      </div>

      <ChartPanel
        title="Limitação por aplicação"
        description="Requisições rejeitadas com 429 nas últimas 24 horas."
        isLoading={rateLimits.isLoading}
        error={rateLimits.error ?? undefined}
        isEmpty={chart.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={chart} layout="horizontal" />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle
          title="Políticas configuradas"
          description="Os tetos se aplicam por par de aplicação e API."
        />
        <DataTable
          data={rateLimits.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={rateLimits.isLoading}
          error={rateLimits.error ?? undefined}
          searchPlaceholder="Pesquisar aplicação ou API…"
          searchValue={(row) => `${row.applicationName} ${row.api}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Reiniciar contadores de limite de taxa"
        warning="Os contadores da janela atual são zerados para esta política. A limitação em andamento para imediatamente e os consumidores recuperam total capacidade de rajada."
        details={
          target
            ? [
                { label: "Aplicação", value: target.applicationName },
                { label: "API", value: target.api },
                { label: "Limitado 24h", value: formatNumber(target.rateLimited) },
              ]
            : undefined
        }
        confirmLabel="Reiniciar contadores"
        environmentNotice="As operações são registradas na trilha de auditoria e reautorizadas no servidor."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "rate-limit.reset", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
