import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard } from "@/components/common/metric-card";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { AppLink } from "@/components/common/app-link";
import { formatCompact, formatMs, formatPercent, formatRelative } from "@/utils/format";
import type { Alert, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/observability/")({
  head: () => ({
    meta: [
      { title: "Visão Geral de Observabilidade — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Sinais essenciais da plataforma CB67 Labs: tráfego, latência, erros e saturação, com o inventário atual de alertas.",
      },
      {
        property: "og:title",
        content: "Visão Geral de Observabilidade — CB67 Labs Control Center",
      },
      {
        property: "og:description",
        content: "Tráfego, latência, erros, saturação e alertas em tempo real.",
      },
    ],
  }),
  component: ObservabilityOverview,
});

function ObservabilityOverview() {
  const [range, setRange] = useState<TimeRange>("24h");
  const overview = useQuery(q.overview(range));
  const alerts = useQuery(q.alerts());
  const services = useQuery(q.services());
  const snapshot = overview.data;

  const firing = (alerts.data ?? []).filter((row) => row.state === "firing");

  const columns: Column<Alert>[] = [
    {
      id: "name",
      header: "Alerta",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <span className="mono-xs text-muted-foreground">{row.source}</span>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "severity",
      header: "Severidade",
      cell: (row) => <StatusBadge status={row.severity} />,
      sortValue: (row) => row.severity,
    },
    {
      id: "started",
      header: "Início",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.startedAt)}</span>
      ),
      sortValue: (row) => row.startedAt,
      align: "right",
    },
    {
      id: "state",
      header: "Estado",
      cell: (row) => <StatusBadge status={row.state} />,
      sortValue: (row) => row.state,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral de Observabilidade"
        description="Métricas, logs e alertas são coletados pela stack da plataforma na rede de gerenciamento. Esta superfície apenas lê essa stack; nunca consulta hosts diretamente."
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requisições"
          value={snapshot ? formatCompact(snapshot.requests) : "—"}
          hint={snapshot ? `${snapshot.rps.toFixed(1)} rps` : undefined}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Latência p95"
          value={snapshot ? formatMs(snapshot.p95) : "—"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Taxa de erro"
          value={snapshot ? formatPercent(snapshot.errorRate) : "—"}
          tone={snapshot && snapshot.errorRate > 1 ? "warn" : "ok"}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Alertas disparando"
          value={firing.length}
          tone={firing.length > 0 ? "crit" : "ok"}
          isLoading={alerts.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Tráfego"
          description="Requisições atendidas pela plataforma."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.requests.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.requests ?? []}
            series={[{ key: "value", label: "Requisições" }]}
          />
        </ChartPanel>
        <ChartPanel
          title="Latência"
          description="Tempo de resposta agregado entre os endpoints."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.latency.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.latency ?? []}
            series={[{ key: "value", label: "Latência" }]}
            variant="line"
            unit="ms"
          />
        </ChartPanel>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChartPanel
          title="Saturação"
          description="Utilização de recursos do cluster."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.resources.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.resources ?? []}
            series={[
              { key: "cpu", label: "CPU" },
              { key: "memory", label: "Memória" },
            ]}
            variant="line"
            unit="%"
          />
        </ChartPanel>
        <ChartPanel
          title="Erros"
          description="Volume de falhas na janela selecionada."
          isLoading={overview.isLoading}
          error={overview.error ?? undefined}
          isEmpty={(snapshot?.charts.errors.length ?? 0) === 0}
        >
          <TimeSeriesChart
            data={snapshot?.charts.errors ?? []}
            series={[{ key: "value", label: "Erros" }]}
          />
        </ChartPanel>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Inventário de alertas"
          description="Alertas disparando e reconhecidos em toda a plataforma."
          actions={
            <AppLink to="/observability/alerts" className="text-xs text-primary hover:underline">
              Todos os alertas
            </AppLink>
          }
        />
        <DataTable
          data={alerts.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={alerts.isLoading}
          error={alerts.error ?? undefined}
          pageSize={10}
          dense
        />
      </div>

      <p className="text-xs text-muted-foreground">
        {(services.data ?? []).length} serviços da plataforma estão reportando saúde ao coletor.
      </p>
    </div>
  );
}
