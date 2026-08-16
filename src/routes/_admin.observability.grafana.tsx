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
          "Pontos de entrada para a instância Grafana da CB67 Labs, com dashboards detalhados que vivem fora do Control Center.",
      },
      { property: "og:title", content: "Grafana — CB67 Labs Control Center" },
      { property: "og:description", content: "Dashboards detalhados hospedados na rede de gerenciamento." },
    ],
  }),
  component: GrafanaPage,
});

const DASHBOARDS = [
  {
    slug: "platform-overview",
    name: "Visão geral da plataforma",
    description: "Sinais essenciais do gateway de API, serviço de licenciamento e componentes de suporte.",
  },
  {
    slug: "api-performance",
    name: "Desempenho da API",
    description: "Percentis de latência por endpoint, throughput e consumo do orçamento de erro.",
  },
  {
    slug: "provider-integrations",
    name: "Integrações com provedores",
    description: "Latência upstream, limitação de taxa e atribuição de falhas por provedor externo.",
  },
  {
    slug: "infrastructure",
    name: "Infraestrutura",
    description: "CPU, memória, armazenamento e saturação de rede do nó Proxmox.",
  },
  {
    slug: "postgresql",
    name: "PostgreSQL",
    description: "Conexões, throughput de transações, taxa de acerto de cache e contenção de locks.",
  },
];

function GrafanaPage() {
  const base = env.grafanaUrl;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Grafana"
        description="Análises de longo prazo e exploração ad-hoc permanecem no Grafana, na rede de gerenciamento. O Control Center apenas fornece links, sem incorporar consultas."
        actions={
          base ? (
            <Button asChild size="sm" variant="outline">
              <a href={base} target="_blank" rel="noreferrer noopener">
                Abrir Grafana
                <ExternalLink className="ml-1 size-3.5" aria-hidden />
              </a>
            </Button>
          ) : undefined
        }
      />

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Instância</h3>
        <dl className="mt-2">
          <StatRow label="Host esperado" value={platformMeta.grafanaDomain} />
          <StatRow
            label="URL configurada"
            value={base ? <code className="mono-xs">{base}</code> : "Não configurado"}
          />
          <StatRow label="Chave de configuração" value={<code className="mono-xs">VITE_GRAFANA_URL</code>} />
          <StatRow label="Rede" value="Apenas rede de gerenciamento; não publicada na internet" />
        </dl>
      </section>

      {!base ? (
        <EmptyState
          message="A URL do Grafana não está configurada"
          hint="Defina VITE_GRAFANA_URL no ambiente de implantação para habilitar os links de dashboard abaixo."
        />
      ) : null}

      <div className="space-y-3">
        <SectionTitle
          title="Dashboards de referência"
          description="Os slugs são provisórios e devem corresponder aos dashboards provisionados na instância do Grafana."
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
