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
          "Postura do firewall de perímetro: política padrão, número de regras ativas, última recarga e conexões bloqueadas recentes.",
      },
      { property: "og:title", content: "Firewall — CB67 Labs Control Center" },
      { property: "og:description", content: "Postura de negação padrão, número de regras e bloqueios recentes." },
    ],
  }),
  component: FirewallPage,
});

const EXPOSED_SURFACES = [
  {
    surface: "Gateway de API",
    port: "443/tcp",
    exposure: "Public",
    control: "TLS mútuo exigido para todo cliente de máquina",
  },
  {
    surface: "Control Center",
    port: "443/tcp",
    exposure: "Restricted",
    control: "Identidade do operador mais vinculação de sessão",
  },
  {
    surface: "Serviço de licenciamento",
    port: "443/tcp",
    exposure: "Public",
    control: "Troca de lease assinada, sem acesso interativo",
  },
  {
    surface: "Stack de observabilidade",
    port: "internal",
    exposure: "Private",
    control: "Acessível somente pela rede de gerenciamento",
  },
  {
    surface: "PostgreSQL",
    port: "5432/tcp",
    exposure: "Private",
    control: "Nenhuma rota fora da rede do host",
  },
];

function FirewallPage() {
  const firewall = useQuery(q.firewall());
  const state = firewall.data;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Firewall"
        description="O perímetro executa uma política de negação padrão: somente as superfícies listadas abaixo aceitam tráfego de entrada. O gerenciamento de regras permanece no host, fora desta interface."
        meta={state ? <StatusBadge status={state.status} /> : undefined}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Postura"
          value={state?.status ?? "—"}
          tone={state?.status === "healthy" ? "ok" : "warn"}
          isLoading={firewall.isLoading}
        />
        <MetricCard label="Regras ativas" value={state?.rulesCount ?? "—"} isLoading={firewall.isLoading} />
        <MetricCard
          label="Bloqueios recentes"
          value={state ? formatNumber(state.recentBlocks) : "—"}
          tone={state && state.recentBlocks > 0 ? "warn" : "ok"}
          isLoading={firewall.isLoading}
        />
        <MetricCard
          label="Última recarga"
          value={state ? formatRelative(state.lastReloadAt) : "—"}
          isLoading={firewall.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Política</h3>
        <dl className="mt-2">
          <StatRow label="Política padrão" value={state?.policy ?? "—"} />
          <StatRow label="Tamanho do conjunto de regras" value={state?.rulesCount ?? "—"} />
          <StatRow
            label="Última recarga"
            value={state ? formatDateTime(state.lastReloadAt) : "—"}
          />
          <StatRow label="Processo de mudança" value="Gerenciamento de configuração do host; não editável a partir desta interface" />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Superfícies expostas"
          description="Intenção documentada para a implantação on-premises; a equipe de backend possui o conjunto de regras autoritativo."
        />
        <div className="panel overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs tracking-wide text-muted-foreground uppercase">
                <th scope="col" className="px-4 py-2 font-medium">Superfície</th>
                <th scope="col" className="px-4 py-2 font-medium">Porta</th>
                <th scope="col" className="px-4 py-2 font-medium">Exposição</th>
                <th scope="col" className="px-4 py-2 font-medium">Controle</th>
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
