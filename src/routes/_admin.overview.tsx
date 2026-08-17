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
import {
  formatCompact,
  formatMs,
  formatNumber,
  formatPercent,
  formatMsOrNull,
  formatPercentOrNull,
  NOT_MEASURED,
} from "@/utils/format";
import type { TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/overview")({
  head: () => ({
    meta: [
      { title: "Visão Geral da Plataforma — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Visão técnica executiva da plataforma CB67 Labs: tráfego, latência, orçamento de erros, licenciamento e saúde da infraestrutura.",
      },
      { property: "og:title", content: "Visão Geral da Plataforma — CB67 Labs Control Center" },
      {
        property: "og:description",
        content:
          "Tráfego, latência, taxa de erros, licenciamento e saúde da infraestrutura em um só lugar.",
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

  // No traffic, no verdict. A green "error rate" card on a platform that has
  // served nothing reports a health check nobody ran.
  const errorTone =
    !data || data.errorRate === null
      ? "neutral"
      : data.errorRate > 2
        ? "crit"
        : data.errorRate > 1
          ? "warn"
          : "ok";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Visão Geral da Plataforma"
        description="Estado técnico consolidado da plataforma: volume de requisições, distribuição de latência, orçamento de erros, licenciamento e saúde dos nós."
        meta={data ? <StatusBadge status={data.platformHealth} /> : null}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requisições"
          value={data ? formatCompact(data.requests) : "—"}
          hint={data ? `${formatNumber(Math.round(data.rps))} req/s atual` : undefined}
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Latência p95 / p99"
          value={data ? `${formatMsOrNull(data.p95)} / ${formatMsOrNull(data.p99)}` : NOT_MEASURED}
          hint="Do ingresso no gateway até a resposta"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Taxa de erros"
          value={data ? formatPercentOrNull(data.errorRate) : NOT_MEASURED}
          tone={errorTone}
          hint="5xx sobre o total de requisições"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Licenças ativas"
          value={data ? formatNumber(data.activeLicenses) : "—"}
          hint={data ? `${data.activeSaas} aplicações SaaS online` : undefined}
          isLoading={overview.isLoading}
        />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPanel
            title="Volume de requisições"
            description="Total de requisições processadas pelo gateway de API na janela selecionada."
            isLoading={overview.isLoading}
            isEmpty={data?.charts.requests.length === 0}
            height={260}
          >
            <TimeSeriesChart
              data={data?.charts.requests ?? []}
              series={[{ key: "requests", label: "Requisições" }]}
            />
          </ChartPanel>
        </div>
        <ChartPanel
          title="Rejeições e erros"
          description="Respostas por código de status, excluindo tráfego bem-sucedido."
          isLoading={overview.isLoading}
          isEmpty={data?.statusCounts.length === 0}
          height={260}
        >
          <DonutChart
            data={(data?.statusCounts ?? []).map((s) => ({ t: s.code, value: s.value }))}
          />
        </ChartPanel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <ChartPanel
          title="Percentis de latência"
          description="p50, p95 e p99 em milissegundos."
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
          title="Requisições por aplicação SaaS"
          description="Maiores consumidores na janela selecionada."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.requestsBySaas.length === 0}
        >
          <CategoryBarChart
            data={data?.charts.requestsBySaas ?? []}
            layout="horizontal"
            colorByIndex
          />
        </ChartPanel>
      </div>

      <section className="space-y-3">
        <SectionTitle
          title="Recursos dos nós"
          description="Uso agregado entre os hosts on-premises."
          actions={
            <AppLink
              to="/infrastructure/hosts"
              className="text-xs font-medium text-primary hover:underline"
            >
              Inspecionar hosts →
            </AppLink>
          }
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {(
            [
              // resources is null until something collects host metrics, so
              // these read "not measured" rather than showing an idle gauge.
              ["CPU", data?.resources?.cpu],
              ["Memória", data?.resources?.memory],
              ["Armazenamento", data?.resources?.storage],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="panel space-y-2 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{label}</span>
                <span className="tabular text-muted-foreground">
                  {value === undefined || value === null ? NOT_MEASURED : formatPercent(value, 1)}
                </span>
              </div>
              <Progress value={value ?? 0} />
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionTitle
          title="Serviços principais"
          description="Saúde reportada pelo plano de controle da plataforma."
          actions={
            <AppLink
              to="/infrastructure/services"
              className="text-xs font-medium text-primary hover:underline"
            >
              Todos os serviços →
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
          title="Licenças por status"
          description="Ativas, carência, expiradas, suspensas e revogadas."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.licensesByStatus.length === 0}
        >
          <CategoryBarChart data={data?.charts.licensesByStatus ?? []} colorByIndex />
        </ChartPanel>
        <ChartPanel
          title="Latência dos provedores"
          description="Latência média upstream por provedor externo, em milissegundos."
          isLoading={overview.isLoading}
          isEmpty={data?.charts.providerLatency.length === 0}
        >
          <TimeSeriesChart
            variant="line"
            unit="ms"
            data={data?.charts.providerLatency ?? []}
            series={[
              { key: "openai", label: "OpenAI" },
              { key: "gemini", label: "Gemini" },
              { key: "maps", label: "Google Maps" },
            ]}
          />
        </ChartPanel>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Falhas de autenticação"
          value={data ? formatNumber(data.authFailures) : "—"}
          tone={data && data.authFailures > 200 ? "warn" : "neutral"}
          hint="Credenciais, tokens e mTLS inválidos"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Limitados por taxa"
          value={data ? formatNumber(data.rateLimited) : "—"}
          hint="Respostas 429 na janela"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="Provedores degradados"
          value={
            data ? formatNumber(data.providers.filter((p) => p.status !== "healthy").length) : "—"
          }
          tone={data && data.providers.some((p) => p.status === "unavailable") ? "crit" : "neutral"}
          hint="Dependências externas"
          isLoading={overview.isLoading}
        />
        <MetricCard
          label="SaaS ativos"
          value={data ? formatNumber(data.activeSaas) : "—"}
          hint="Aplicações consumindo a API"
          isLoading={overview.isLoading}
        />
      </div>
    </div>
  );
}
