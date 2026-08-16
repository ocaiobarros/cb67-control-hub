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
      { title: "Configurações — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Preferências do Control Center, configuração de tempo de execução e a identidade do operador atual, com o modo de fonte de dados em vigor.",
      },
      { property: "og:title", content: "Configurações — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Preferências da interface, configuração de tempo de execução e identidade.",
      },
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
        title="Configurações"
        description="As preferências da interface são armazenadas localmente no navegador. A configuração da plataforma é de responsabilidade do backend e é exibida aqui apenas para leitura."
        meta={<StatusBadge status={isMockMode ? "maintenance" : "healthy"} />}
      />

      <div className="space-y-3">
        <SectionTitle title="Aparência" description="Aplica-se somente a este navegador." />
        <section className="panel flex flex-wrap items-center justify-between gap-3 p-4">
          <div>
            <p className="text-sm font-medium">Tema</p>
            <p className="text-xs text-muted-foreground">
              Atualmente <code className="mono-xs">{theme}</code>
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
              Escuro
            </Button>
            <Button
              variant={theme === "light" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (theme !== "light") toggle();
              }}
            >
              Claro
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Configuração de tempo de execução"
          description="Injetada em tempo de build por meio de variáveis de ambiente; nunca fixada na interface."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Ambiente" value={<code className="mono-xs">{env.environment}</code>} />
            <StatRow
              label="Fonte de dados"
              value={isMockMode ? "Adaptador simulado" : "Adaptador HTTP"}
            />
            <StatRow
              label="URL base da API"
              value={
                env.apiBaseUrl ? (
                  <code className="mono-xs">{env.apiBaseUrl}</code>
                ) : (
                  "Não configurado"
                )
              }
            />
            <StatRow
              label="URL base de licenciamento"
              value={
                env.licenseBaseUrl ? (
                  <code className="mono-xs">{env.licenseBaseUrl}</code>
                ) : (
                  "Não configurado"
                )
              }
            />
            <StatRow
              label="URL base de status"
              value={
                env.statusBaseUrl ? (
                  <code className="mono-xs">{env.statusBaseUrl}</code>
                ) : (
                  "Não configurado"
                )
              }
            />
            <StatRow
              label="URL do Prometheus"
              value={
                env.prometheusUrl ? (
                  <code className="mono-xs">{env.prometheusUrl}</code>
                ) : (
                  "Não configurado"
                )
              }
            />
            <StatRow
              label="URL do Alertmanager"
              value={
                env.alertmanagerUrl ? (
                  <code className="mono-xs">{env.alertmanagerUrl}</code>
                ) : (
                  "Não configurado"
                )
              }
            />
            <StatRow label="Telemetria" value={env.telemetryEnabled ? "Ativada" : "Desativada"} />
          </dl>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Identidade"
          description="Fornecida pela plataforma após a autenticação."
        />
        <section className="panel p-4">
          <dl>
            <StatRow label="Operador" value={user?.name ?? "—"} />
            <StatRow label="E-mail" value={user?.email ?? "—"} />
            <StatRow label="Função" value={user?.role ?? "—"} />
            <StatRow
              label="Permissões concedidas"
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
              Sair
            </Button>
          </div>
        </section>
      </div>

      <div className="space-y-3">
        <SectionTitle title="Implantação" description="Ambiente alvo deste frontend." />
        <section className="panel p-4">
          <dl>
            <StatRow label="Produto" value={platformMeta.productName} />
            <StatRow
              label="Host de gerenciamento"
              value={<code className="mono-xs">{platformMeta.adminDomain}</code>}
            />
            <StatRow
              label="Host público"
              value={<code className="mono-xs">{platformMeta.publicDomain}</code>}
            />
            <StatRow label="Plataforma do host" value="Debian 13 no Proxmox, on-premises" />
          </dl>
        </section>
      </div>
    </div>
  );
}
