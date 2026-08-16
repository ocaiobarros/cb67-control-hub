import { createFileRoute } from "@tanstack/react-router";
import { Activity, Boxes, KeyRound, Network, ShieldCheck, SquareStack } from "lucide-react";
import { PublicShell } from "@/components/layout/public-shell";
import { AppLink } from "@/components/common/app-link";
import { Button } from "@/components/ui/button";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CB67 Labs API Platform — On-Premises APIs, Licensing and Observability" },
      {
        name: "description",
        content:
          "CB67 Labs operates an on-premises API platform: versioned REST APIs, machine-to-machine identity, software licensing, internal PKI and full observability.",
      },
      {
        property: "og:title",
        content: "CB67 Labs API Platform — On-Premises APIs, Licensing and Observability",
      },
      {
        property: "og:description",
        content:
          "Versioned REST APIs, machine identity, licensing, internal PKI and observability, operated on-premises.",
      },
    ],
  }),
  component: PublicHome,
});

const CAPABILITIES = [
  {
    icon: Network,
    title: "Versioned REST APIs",
    body: "Scoped, documented endpoints with explicit rate limits and monthly quotas per client.",
  },
  {
    icon: KeyRound,
    title: "Machine identity",
    body: "OAuth client credentials and mTLS for service-to-service authentication.",
  },
  {
    icon: SquareStack,
    title: "Software licensing",
    body: "Products, plans, features and signed leases with offline grace periods.",
  },
  {
    icon: ShieldCheck,
    title: "Internal PKI",
    body: "Issued, rotated and revoked certificates for every internal trust relationship.",
  },
  {
    icon: Boxes,
    title: "SaaS instances",
    body: "Per-application environments with version tracking and heartbeat monitoring.",
  },
  {
    icon: Activity,
    title: "Observability",
    body: "Metrics, structured logs, alerting and audited operator activity.",
  },
];

function PublicHome() {
  return (
    <PublicShell>
      <section className="space-y-6 border-b border-border pb-12">
        <p className="mono-xs text-muted-foreground uppercase">On-premises · Debian 13 · Proxmox</p>
        <h1 className="max-w-3xl text-4xl font-semibold tracking-tight sm:text-5xl">
          The {platformMeta.name} API platform, operated on our own infrastructure.
        </h1>
        <p className="max-w-2xl text-base text-muted-foreground">
          APIs, machine identity, software licensing, internal PKI and observability run as one
          platform. No third-party control plane, no external data path.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button asChild>
            <AppLink to="/docs">Read the documentation</AppLink>
          </Button>
          <Button asChild variant="outline">
            <AppLink to="/status">Platform status</AppLink>
          </Button>
        </div>
      </section>

      <section className="space-y-6 py-12">
        <h2 className="text-lg font-semibold tracking-tight">Platform capabilities</h2>
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
        <h2 className="text-lg font-semibold tracking-tight">Planes</h2>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Public</p>
            <p className="text-sm text-muted-foreground">
              Documentation, status and changelog on <code className="mono-xs">{platformMeta.publicDomain}</code>.
            </p>
          </div>
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Management</p>
            <p className="text-sm text-muted-foreground">
              The Control Center on <code className="mono-xs">{platformMeta.adminDomain}</code>, restricted to
              operators.
            </p>
          </div>
          <div className="panel space-y-1 p-5">
            <p className="text-sm font-semibold">Observability</p>
            <p className="text-sm text-muted-foreground">
              Dashboards on <code className="mono-xs">{platformMeta.grafanaDomain}</code>, management network only.
            </p>
          </div>
        </div>
      </section>
    </PublicShell>
  );
}
