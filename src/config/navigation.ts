import {
  Activity,
  Boxes,
  Database,
  Gauge,
  HardDriveDownload,
  KeyRound,
  LayoutDashboard,
  Network,
  Plug,
  ScrollText,
  Server,
  Settings,
  ShieldCheck,
  SquareStack,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
/**
 * A path in the menu.
 *
 * Deliberately `string` rather than the router's generated key union. That union
 * spells index routes with a trailing slash ("/providers/") and contains route
 * PATTERNS ("/providers/$providerId") rather than the concrete paths a menu
 * links to ("/providers/openai"), so typing against it would reject entries that
 * resolve perfectly well.
 *
 * The guarantee is enforced instead by src/config/navigation.test.ts, which
 * matches every entry against the router's real patterns — index slash and
 * dynamic segments included. Two entries, "Ambientes" (/saas/environments) and
 * "Uso" (/saas/usage), were present in the menu, absent from the router and from
 * docs/ROUTES.md, and were the source of the 404s the owner hit after signing
 * in. A menu item that leads nowhere advertises a capability the platform does
 * not have.
 */
export interface NavItem {
  label: string;
  to: string;
}

export interface NavGroup {
  label: string;
  icon: LucideIcon;
  to?: string;
  items?: NavItem[];
}

/** Single navigation model: sidebar, breadcrumbs and command palette read from it. */
export const NAVIGATION: NavGroup[] = [
  { label: "Visão Geral", icon: LayoutDashboard, to: "/overview" },
  {
    label: "Infraestrutura",
    icon: Server,
    items: [
      { label: "Hosts", to: "/infrastructure/hosts" },
      { label: "CPU e Memória", to: "/infrastructure/compute" },
      { label: "Armazenamento", to: "/infrastructure/storage" },
      { label: "Rede", to: "/infrastructure/network" },
      { label: "Serviços", to: "/infrastructure/services" },
    ],
  },
  {
    label: "SaaS",
    icon: Boxes,
    items: [
      { label: "Aplicações", to: "/saas/applications" },
      { label: "Instâncias", to: "/saas/instances" },
      { label: "Clientes", to: "/saas/clients" },
    ],
  },
  {
    label: "APIs",
    icon: Network,
    items: [
      { label: "Endpoints", to: "/apis/endpoints" },
      { label: "Requisições", to: "/apis/requests" },
      { label: "Erros", to: "/apis/errors" },
      { label: "Latência", to: "/apis/latency" },
      { label: "Cotas", to: "/apis/quotas" },
      { label: "Limites de Taxa", to: "/apis/rate-limits" },
    ],
  },
  {
    label: "Provedores",
    icon: Plug,
    items: [
      { label: "Visão Geral", to: "/providers" },
      { label: "OpenAI", to: "/providers/openai" },
      { label: "Gemini", to: "/providers/gemini" },
      { label: "Google Maps", to: "/providers/google-maps" },
    ],
  },
  {
    label: "Licenciamento",
    icon: SquareStack,
    items: [
      { label: "Visão Geral", to: "/licensing" },
      { label: "Produtos", to: "/licensing/products" },
      { label: "Clientes", to: "/licensing/customers" },
      { label: "Licenças", to: "/licensing/licenses" },
      { label: "Instalações", to: "/licensing/installations" },
      { label: "Concessões", to: "/licensing/leases" },
      { label: "Planos", to: "/licensing/plans" },
      { label: "Recursos", to: "/licensing/features" },
      { label: "Revogações", to: "/licensing/revocations" },
    ],
  },
  {
    label: "Identidade e Acesso",
    icon: KeyRound,
    items: [
      { label: "Administradores", to: "/identity/administrators" },
      { label: "Funções", to: "/identity/roles" },
      { label: "Permissões", to: "/identity/permissions" },
      { label: "Clientes de Máquina", to: "/identity/machine-clients" },
      { label: "Escopos", to: "/identity/scopes" },
      { label: "Sessões", to: "/identity/sessions" },
    ],
  },
  {
    label: "PKI",
    icon: ShieldCheck,
    items: [
      { label: "Certificados", to: "/pki/certificates" },
      { label: "Expiração", to: "/pki/expiration" },
      { label: "Rotação", to: "/pki/rotation" },
      { label: "Revogação", to: "/pki/revocation" },
    ],
  },
  {
    label: "Segurança",
    icon: Activity,
    items: [
      { label: "Visão Geral", to: "/security" },
      { label: "Autenticação", to: "/security/authentication" },
      { label: "Autorização", to: "/security/authorization" },
      { label: "Tentativas Falhas", to: "/security/failed-attempts" },
      { label: "Firewall", to: "/security/firewall" },
      { label: "Eventos de Segurança", to: "/security/events" },
      { label: "Sessões", to: "/security/sessions" },
    ],
  },
  {
    label: "Observabilidade",
    icon: Gauge,
    items: [
      { label: "Visão Geral", to: "/observability" },
      { label: "Métricas", to: "/observability/metrics" },
      { label: "Logs", to: "/observability/logs" },
      { label: "Alertas", to: "/observability/alerts" },
      { label: "Prometheus", to: "/observability/prometheus" },
    ],
  },
  {
    label: "Banco de Dados",
    icon: Database,
    items: [
      { label: "Saúde", to: "/database/health" },
      { label: "Conexões", to: "/database/connections" },
      { label: "Desempenho", to: "/database/performance" },
      { label: "Crescimento", to: "/database/growth" },
    ],
  },
  {
    label: "Backups",
    icon: HardDriveDownload,
    items: [
      { label: "Visão Geral", to: "/backups" },
      { label: "Rotinas", to: "/backups/jobs" },
      { label: "Histórico", to: "/backups/history" },
      { label: "Checksums", to: "/backups/checksums" },
      { label: "Testes de Restauração", to: "/backups/restore-tests" },
    ],
  },
  { label: "Auditoria", icon: ScrollText, to: "/audit" },
  { label: "Configurações", icon: Settings, to: "/settings" },
];

const FLAT: { label: string; to: string; group?: string }[] = NAVIGATION.flatMap((group) =>
  group.to
    ? [{ label: group.label, to: group.to }]
    : (group.items ?? []).map((item) => ({ ...item, group: group.label })),
);

export const NAV_INDEX = FLAT;

export function breadcrumbsFor(pathname: string): { label: string; to?: string }[] {
  const match = [...FLAT]
    .sort((a, b) => b.to.length - a.to.length)
    .find((entry) => pathname === entry.to || pathname.startsWith(`${entry.to}/`));
  if (!match) return [];
  const crumbs: { label: string; to?: string }[] = [];
  if (match.group) crumbs.push({ label: match.group });
  crumbs.push({ label: match.label, to: match.to });
  if (pathname !== match.to) {
    const tail = pathname.slice(match.to.length + 1).split("/")[0];
    if (tail) crumbs.push({ label: decodeURIComponent(tail) });
  }
  return crumbs;
}
