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
  { label: "Overview", icon: LayoutDashboard, to: "/overview" },
  {
    label: "Infrastructure",
    icon: Server,
    items: [
      { label: "Hosts", to: "/infrastructure/hosts" },
      { label: "CPU & Memory", to: "/infrastructure/compute" },
      { label: "Storage", to: "/infrastructure/storage" },
      { label: "Network", to: "/infrastructure/network" },
      { label: "Services", to: "/infrastructure/services" },
    ],
  },
  {
    label: "SaaS",
    icon: Boxes,
    items: [
      { label: "Applications", to: "/saas/applications" },
      { label: "Instances", to: "/saas/instances" },
      { label: "Clients", to: "/saas/clients" },
      { label: "Environments", to: "/saas/environments" },
      { label: "Usage", to: "/saas/usage" },
    ],
  },
  {
    label: "APIs",
    icon: Network,
    items: [
      { label: "Endpoints", to: "/apis/endpoints" },
      { label: "Requests", to: "/apis/requests" },
      { label: "Errors", to: "/apis/errors" },
      { label: "Latency", to: "/apis/latency" },
      { label: "Quotas", to: "/apis/quotas" },
      { label: "Rate Limits", to: "/apis/rate-limits" },
    ],
  },
  {
    label: "Providers",
    icon: Plug,
    items: [
      { label: "Overview", to: "/providers" },
      { label: "OpenAI", to: "/providers/openai" },
      { label: "Gemini", to: "/providers/gemini" },
      { label: "Google Maps", to: "/providers/google-maps" },
    ],
  },
  {
    label: "Licensing",
    icon: SquareStack,
    items: [
      { label: "Overview", to: "/licensing" },
      { label: "Products", to: "/licensing/products" },
      { label: "Customers", to: "/licensing/customers" },
      { label: "Licenses", to: "/licensing/licenses" },
      { label: "Installations", to: "/licensing/installations" },
      { label: "Leases", to: "/licensing/leases" },
      { label: "Plans", to: "/licensing/plans" },
      { label: "Features", to: "/licensing/features" },
      { label: "Revocations", to: "/licensing/revocations" },
    ],
  },
  {
    label: "Identity & Access",
    icon: KeyRound,
    items: [
      { label: "Administrators", to: "/identity/administrators" },
      { label: "Roles", to: "/identity/roles" },
      { label: "Permissions", to: "/identity/permissions" },
      { label: "Machine Clients", to: "/identity/machine-clients" },
      { label: "Scopes", to: "/identity/scopes" },
      { label: "Sessions", to: "/identity/sessions" },
    ],
  },
  {
    label: "PKI",
    icon: ShieldCheck,
    items: [
      { label: "Certificates", to: "/pki/certificates" },
      { label: "Expiration", to: "/pki/expiration" },
      { label: "Rotation", to: "/pki/rotation" },
      { label: "Revocation", to: "/pki/revocation" },
    ],
  },
  {
    label: "Security",
    icon: Activity,
    items: [
      { label: "Overview", to: "/security" },
      { label: "Authentication", to: "/security/authentication" },
      { label: "Authorization", to: "/security/authorization" },
      { label: "Failed Attempts", to: "/security/failed-attempts" },
      { label: "Firewall", to: "/security/firewall" },
      { label: "Security Events", to: "/security/events" },
      { label: "Sessions", to: "/security/sessions" },
    ],
  },
  {
    label: "Observability",
    icon: Gauge,
    items: [
      { label: "Overview", to: "/observability" },
      { label: "Metrics", to: "/observability/metrics" },
      { label: "Logs", to: "/observability/logs" },
      { label: "Alerts", to: "/observability/alerts" },
      { label: "Grafana", to: "/observability/grafana" },
    ],
  },
  {
    label: "Database",
    icon: Database,
    items: [
      { label: "Health", to: "/database/health" },
      { label: "Connections", to: "/database/connections" },
      { label: "Performance", to: "/database/performance" },
      { label: "Growth", to: "/database/growth" },
    ],
  },
  {
    label: "Backups",
    icon: HardDriveDownload,
    items: [
      { label: "Overview", to: "/backups" },
      { label: "Jobs", to: "/backups/jobs" },
      { label: "History", to: "/backups/history" },
      { label: "Checksums", to: "/backups/checksums" },
      { label: "Restore Tests", to: "/backups/restore-tests" },
    ],
  },
  { label: "Audit", icon: ScrollText, to: "/audit" },
  { label: "Settings", icon: Settings, to: "/settings" },
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
