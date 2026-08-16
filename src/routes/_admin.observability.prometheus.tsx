import { createFileRoute } from "@tanstack/react-router";
import { ExternalLink } from "lucide-react";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { StatRow } from "@/components/common/metric-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/common/empty-state";
import { env, platformMeta } from "@/config/env";

export const Route = createFileRoute("/_admin/observability/prometheus")({
  head: () => ({
    meta: [
      { title: "Prometheus e Alertmanager — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Pontos de entrada para o Prometheus e o Alertmanager da CB67 Labs, na rede de gerenciamento.",
      },
      { property: "og:title", content: "Prometheus e Alertmanager — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Consultas e alertas hospedados na rede de gerenciamento.",
      },
    ],
  }),
  component: PrometheusPage,
});

/**
 * Reference PromQL expressions, opened in the Prometheus expression browser.
 *
 * These replace what would have been Grafana dashboards. Grafana was removed
 * from platform scope to keep the memory budget on a constrained host, so the
 * Control Center links to Prometheus' own query interface instead of promising
 * dashboards that are not provisioned.
 */
const QUERIES = [
  {
    id: "platform-overview",
    name: "Visão geral da plataforma",
    description: "Taxa de requisições por serviço, somada em janelas de cinco minutos.",
    expr: "sum by (service) (rate(cb67_http_requests_total[5m]))",
  },
  {
    id: "api-latency",
    name: "Latência da API (p95)",
    description: "Percentil 95 de latência por endpoint, a partir do histograma de duração.",
    expr: "histogram_quantile(0.95, sum by (le, endpoint) (rate(cb67_http_request_duration_seconds_bucket[5m])))",
  },
  {
    id: "error-rate",
    name: "Taxa de erro",
    description: "Proporção de respostas 5xx sobre o total, por serviço.",
    expr: 'sum by (service) (rate(cb67_http_requests_total{status=~"5.."}[5m])) / sum by (service) (rate(cb67_http_requests_total[5m]))',
  },
  {
    id: "provider-integrations",
    name: "Integrações com provedores",
    description: "Latência upstream e limitação de taxa por provedor externo.",
    expr: "sum by (provider, status) (rate(cb67_provider_requests_total[5m]))",
  },
  {
    id: "infrastructure",
    name: "Infraestrutura",
    description: "CPU, memória e saturação de disco do host, via node_exporter.",
    expr: '100 - (avg by (instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])) * 100)',
  },
  {
    id: "postgresql",
    name: "PostgreSQL",
    description: "Conexões ativas contra o limite configurado.",
    expr: "sum(pg_stat_activity_count) / sum(pg_settings_max_connections)",
  },
];

function PrometheusPage() {
  const prometheus = env.prometheusUrl;
  const alertmanager = env.alertmanagerUrl;
  const configured = Boolean(prometheus);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prometheus e Alertmanager"
        description="Consultas de longo prazo e exploração ad-hoc vivem no Prometheus, na rede de gerenciamento. O Control Center apenas fornece links, sem incorporar consultas."
        actions={
          prometheus ? (
            <Button asChild size="sm" variant="outline">
              <a href={prometheus} target="_blank" rel="noreferrer noopener">
                Abrir Prometheus
                <ExternalLink className="ml-1 size-3.5" aria-hidden />
              </a>
            </Button>
          ) : undefined
        }
      />

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Instâncias</h3>
        <dl className="mt-2">
          <StatRow label="Host do Prometheus" value={platformMeta.prometheusDomain} />
          <StatRow
            label="URL do Prometheus"
            value={prometheus ? <code className="mono-xs">{prometheus}</code> : "Não configurado"}
          />
          <StatRow
            label="URL do Alertmanager"
            value={
              alertmanager ? <code className="mono-xs">{alertmanager}</code> : "Não configurado"
            }
          />
          <StatRow label="Rede" value="Apenas rede de gerenciamento; não publicada na internet" />
        </dl>
      </section>

      {!configured ? (
        <EmptyState
          message="A URL do Prometheus não está configurada"
          hint="Defina VITE_PROMETHEUS_URL no ambiente de implantação para habilitar os links de consulta abaixo."
        />
      ) : null}

      <div className="space-y-3">
        <SectionTitle
          title="Consultas de referência"
          description="Expressões PromQL abertas no navegador de consultas do Prometheus. Substituem os dashboards do Grafana, que não faz parte do escopo da plataforma."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {QUERIES.map((query) => (
            <div key={query.id} className="panel flex flex-col gap-2 p-4">
              <div>
                <p className="text-sm font-medium">{query.name}</p>
                <code className="mono-xs break-all text-muted-foreground">{query.expr}</code>
              </div>
              <p className="flex-1 text-xs text-muted-foreground">{query.description}</p>
              {prometheus ? (
                <Button asChild size="sm" variant="outline" className="self-start">
                  <a
                    href={`${prometheus.replace(/\/$/, "")}/graph?g0.expr=${encodeURIComponent(
                      query.expr,
                    )}&g0.tab=0`}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Abrir
                    <ExternalLink className="ml-1 size-3.5" aria-hidden />
                  </a>
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Link indisponível</span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
