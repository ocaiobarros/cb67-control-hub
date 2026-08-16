import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/features/theme/theme-context";
import { useAuth } from "@/features/auth/auth-context";
import { env, platformMeta } from "@/config/env";
import { isMockMode } from "@/api/client";

export const Route = createFileRoute("/_admin/settings")({
  head: () => ({
    meta: [
      { title: "Settings — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Control Center preferences, runtime configuration and the current operator identity, with the data-source mode in effect.",
      },
      { property: "og:title", content: "Settings — CB67 Labs Control Center" },
      { property: "og:description", content: "Interface preferences, runtime configuration and identity." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Interface preferences are stored locally in the browser. Platform configuration is owned by the backend and shown here read-only."
        meta={<StatusBadge status={isMockMode ? "maintenance" : "healthy"} />}
      />

      <div className="space-y-3">
        <SectionTitle title="Appearance" description="Applies to this browser only." />
        <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Theme</p>
            <p className="text-xs text-muted-foreground">
              Currently <code className="mono-xs">{theme}</code>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant={theme === "dark" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (theme !== "dark") toggle();
              }}
            >
              Dark
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (theme !== "light") toggle();
              }}
            >
              Light
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Runtime configuration"
          description="Injected at build time through environment variables; never hardcoded in the interface."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Environment" value={<code className="mono-xs">{env.environment}</code>} />
            <StatRow label="Data source" value={isMockMode ? "Mock adapter" : "HTTP adapter"} />
            <StatRow
              label="API base URL"
              value={env.apiBaseUrl ? <code className="mono-xs">{env.apiBaseUrl}</code> : "Not configured"}
            />
            <StatRow
              label="Licensing base URL"
              value={
                env.licenseBaseUrl ? <code className="mono-xs">{env.licenseBaseUrl}</code> : "Not configured"
              }
            />
            <StatRow
              label="Status base URL"
              value={env.statusBaseUrl ? <code className="mono-xs">{env.statusBaseUrl}</code> : "Not configured"}
            />
            <StatRow
              label="Grafana URL"
              value={env.grafanaUrl ? <code className="mono-xs">{env.grafanaUrl}</code> : "Not configured"}
            />
            <StatRow label="Telemetry" value={env.telemetryEnabled ? "Enabled" : "Disabled"} />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Identity" description="Provided by the platform after authentication." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Operator" value={user?.name ?? "—"} />
            <StatRow label="Email" value={user?.email ?? "—"} />
            <StatRow label="Role" value={user?.role ?? "—"} />
            <StatRow
              label="Granted permissions"
              value={
                user ? (
                  <span className="mono-xs break-words">{user.permissions.join(", ")}</span>
                ) : (
                  "—"
                )
              }
            />
          </dl>
          <div className="mt-4 flex justify-end">
            <Button variant="outline" size="sm" onClick={() => void logout()}>
              Sign out
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Deployment" description="Target environment for this frontend." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Product" value={platformMeta.productName} />
            <StatRow label="Management host" value={<code className="mono-xs">{platformMeta.adminDomain}</code>} />
            <StatRow label="Public host" value={<code className="mono-xs">{platformMeta.publicDomain}</code>} />
            <StatRow label="Host platform" value="Debian 13 on Proxmox, on-premises" />
          </dl>
        </section>
      </div>
    </div>
  );
}
