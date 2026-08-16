import { createFileRoute } from "@tanstack/react-router";
import { Activity, Boxes, KeyRound, Network, ShieldCheck, SquareStack } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { AppLink } from "@/components/common/app-link";
import { Button } from "@/components/ui/button";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CB67 Labs API Platform — APIs, licenciamento e observabilidade on-premises" },
      {
        name: "description",
        content:
          "A CB67 Labs opera uma plataforma de API on-premises: APIs REST versionadas, identidade máquina a máquina, licenciamento de software, PKI interna e observabilidade completa.",
      },
      {
        property: "og:title",
        content: "CB67 Labs API Platform — APIs, licenciamento e observabilidade on-premises",
      },
      {
        property: "og:description",
        content:
          "APIs REST versionadas, identidade de máquina, licenciamento, PKI interna e observabilidade, operados on-premises.",
      },
    ],
  }),
  component: PublicHome,
});

const CAPABILITIES = [
  {
    icon: Network,
    title: "APIs REST versionadas",
    body: "Endpoints delimitados por escopo e documentados, com limites de taxa explícitos e cotas mensais por cliente.",
  },
  {
    icon: KeyRound,
    title: "Identidade de máquina",
    body: "Credenciais de cliente OAuth e mTLS para autenticação serviço a serviço.",
  },
  {
    icon: SquareStack,
    title: "Licenciamento de software",
    body: "Produtos, planos, recursos e leases assinados com períodos de carência offline.",
  },
  {
    icon: ShieldCheck,
    title: "PKI interna",
    body: "Certificados emitidos, rotacionados e revogados para cada relação de confiança interna.",
  },
  {
    icon: Boxes,
    title: "Instâncias SaaS",
    body: "Ambientes por aplicação com rastreamento de versão e monitoramento de heartbeat.",
  },
  {
    icon: Activity,
    title: "Observabilidade",
    body: "Métricas, logs estruturados, alertas e atividade de operadores auditada.",
  },
];

function PublicHome() {
  return (
    <PublicShell>
      <section className="space-y-6 border-b border-border pb-12">
        <p className="mono-xs text-muted-foreground uppercase">On-premises · Debian 13 · Proxmox</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          A plataforma de API {platformMeta.name}, operada em nossa própria infraestrutura.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          APIs, identidade de máquina, licenciamento de software, PKI interna e observabilidade
          rodam como uma única plataforma. Sem plano de controle de terceiros, sem trajeto externo de dados.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <AppLink to="/docs">Ler a documentação</AppLink>
          </Button>
          <Button asChild variant="outline">
            <AppLink to="/status">Status da plataforma</AppLink>
          </Button>
        </div>
      </section>

      <section className="space-y-6 py-12">
        <h2 className="text-lg font-semibold tracking-tight">Capacidades da plataforma</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CAPABILITIES.map((item) => (
            <article key={item.title} className="panel space-y-2 p-5">
              <item.icon className="size-5 text-primary" aria-hidden />
              <h3 className="text-sm font-semibold">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="space-y-4 border-t border-border pt-12">
        <h2 className="text-lg font-semibold tracking-tight">Planos</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Pública</p>
            <p className="text-sm text-muted-foreground">
              Documentação, status e changelog em <code className="mono-xs">{platformMeta.publicDomain}</code>.
            </p>
          </div>
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Gestão</p>
            <p className="text-sm text-muted-foreground">
              O Control Center em <code className="mono-xs">{platformMeta.adminDomain}</code>, restrito a
              operadores.
            </p>
          </div>
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Observabilidade</p>
            <p className="text-sm text-muted-foreground">
              Dashboards em <code className="mono-xs">{platformMeta.grafanaDomain}</code>, somente na rede de gestão.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
