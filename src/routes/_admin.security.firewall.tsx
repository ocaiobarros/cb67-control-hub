import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatDateTime, formatNumber, formatRelative } from "@/utils/format";

export const Route = createFileRoute("/_admin/security/firewall")({
  head: () => ({
    meta: [
      { title: "Firewall — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Perimeter firewall posture: default policy, active rule count, last reload and recent blocked connections.",
      },
      { property: "og:title", content: "Firewall — CB67 Labs Control Center" },
      { property: "og:description", content: "Default-deny posture, rule count and recent blocks." },
    ],
  }),
  component: FirewallPage,
});

const EXPOSED_SURFACES = [
  {
    surface: "API gateway",
    port: "443/tcp",
    exposure: "Public",
    control: "Mutual TLS required for every machine client",
  },
  {
    surface: "Control Center",
    port: "443/tcp",
    exposure: "Restricted",
    control: "Operator identity plus session binding",
  },
  {
    surface: "Licensing service",
    port: "443/tcp",
    exposure: "Public",
    control: "Signed lease exchange, no interactive access",
  },
  {
    surface: "Observability stack",
    port: "internal",
    exposure: "Private",
    control: "Reachable from the management network only",
  },
  {
    surface: "PostgreSQL",
    port: "5432/tcp",
    exposure: "Private",
    control: "No route from outside the host network",
  },
];

function FirewallPage() {
  const firewall = useQuery(q.firewall());
  const state = firewall.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firewall"
        description="The perimeter runs a default-deny policy: only the surfaces listed below accept inbound traffic. Rule management stays on the host, outside this interface."
        meta={state ? <StatusBadge status={state.status} /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Posture"
          value={state?.status ?? "—"}
          tone={state?.status === "healthy" ? "ok" : "warn"}
          isLoading={firewall.isLoading}
        />
        <MetricCard label="Active rules" value={state?.rulesCount ?? "—"} isLoading={firewall.isLoading} />
        <MetricCard
          label="Recent blocks"
          value={state ? formatNumber(state.recentBlocks) : "—"}
          tone={state && state.recentBlocks > 0 ? "warn" : "ok"}
          isLoading={firewall.isLoading}
        />
        <MetricCard
          label="Last reload"
          value={state ? formatRelative(state.lastReloadAt) : "—"}
          isLoading={firewall.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Policy</h3>
        <dl className="mt-2">
          <StatRow label="Default policy" value={state?.policy ?? "—"} />
          <StatRow label="Rule set size" value={state?.rulesCount ?? "—"} />
          <StatRow
            label="Last reload"
            value={state ? formatDateTime(state.lastReloadAt) : "—"}
          />
          <StatRow label="Change process" value="Host configuration management; not editable from this interface" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Exposed surfaces"
          description="Documented intent for the on-premises deployment; the backend team owns the authoritative rule set."
        />
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-2 font-medium">Surface</th>
                <th scope="col" className="px-4 py-2 font-medium">Port</th>
                <th scope="col" className="px-4 py-2 font-medium">Exposure</th>
                <th scope="col" className="px-4 py-2 font-medium">Control</th>
              </tr>
            </thead>
            <tbody>
              {EXPOSED_SURFACES.map((row) => (
                <tr key={row.surface} className="border-b border-border last:border-0">
                  <td className="px-4 py-2 font-medium">{row.surface}</td>
                  <td className="px-4 py-2">
                    <code className="mono-xs text-muted-foreground">{row.port}</code>
                  </td>
                  <td className="px-4 py-2">
                    <StatusBadge
                      status={row.exposure}
                      tone={row.exposure === "Public" ? "warn" : row.exposure === "Private" ? "ok" : "info"}
                    />
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{row.control}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
