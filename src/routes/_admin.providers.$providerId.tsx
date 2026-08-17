import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, TimeSeriesChart } from "@/components/charts/chart-panel";
import { TimeRangeSelect } from "@/components/common/time-range-select";
import { MaskedSecret } from "@/components/common/copy-button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import {
  formatCompact,
  formatMs,
  formatNumber,
  formatPercent,
  formatRelative,
  formatMsOrNull,
  formatPercentOrNull,
  formatRelativeOrNull,
} from "@/utils/format";
import type { CredentialMetadata, Provider, ProviderProject, TimeRange } from "@/types";

export const Route = createFileRoute("/_admin/providers/$providerId")({
  head: ({ params }) => {
    const name = params.providerId
      .split("-")
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(" ");
    return {
      meta: [
        { title: `Integração ${name} — CB67 Labs Control Center` },
        {
          name: "description",
          content: `Saúde upstream, projetos, pressão de cota e estado de rotação de credenciais da integração ${name}.`,
        },
        { property: "og:title", content: `Integração ${name} — CB67 Labs Control Center` },
        {
          property: "og:description",
          content: `Tráfego, latência e postura de credenciais para ${name}.`,
        },
      ],
    };
  },
  component: ProviderDetail,
});

function ProviderDetail() {
  const { providerId } = Route.useParams();
  const id = providerId as Provider["id"];
  const [range, setRange] = useState<TimeRange>("24h");
  const providers = useQuery(q.providers());
  const projects = useQuery(q.providerProjects(id));
  const credentials = useQuery(q.credentials(id));
  const series = useQuery(q.providerSeries(id, range));
  const action = useAdminAction();
  const [rotating, setRotating] = useState<CredentialMetadata | null>(null);

  const provider = (providers.data ?? []).find((row) => row.id === id);

  if (!providers.isLoading && !provider) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Provedor não encontrado"
          description="Nenhuma integração está registrada para este identificador."
        />
        <EmptyState
          message="Provedor desconhecido"
          hint="As integrações suportadas são OpenAI, Gemini e Google Maps."
        />
      </div>
    );
  }

  const projectColumns: Column<ProviderProject>[] = [
    {
      id: "project",
      header: "Projeto",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.project}</code>
          <p className="text-xs text-muted-foreground">{row.applicationName}</p>
        </div>
      ),
      sortValue: (row) => row.project,
    },
    {
      id: "environment",
      header: "Ambiente",
      cell: (row) => <StatusBadge status={row.environment} tone="info" />,
      sortValue: (row) => row.environment,
    },
    {
      id: "credential",
      header: "Credencial",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.credentialAlias}</code>,
    },
    {
      id: "requests",
      header: "Requisições 24h",
      cell: (row) => <span className="tabular">{formatCompact(row.requests24h)}</span>,
      sortValue: (row) => row.requests24h,
      align: "right",
    },
    {
      id: "throttled",
      header: "Limitado por taxa",
      cell: (row) => (
        <span className={row.rateLimited24h > 0 ? "tabular text-warn" : "tabular"}>
          {formatNumber(row.rateLimited24h)}
        </span>
      ),
      sortValue: (row) => row.rateLimited24h,
      align: "right",
    },
    {
      id: "quota",
      header: "Uso de cota",
      cell: (row) => (
        // No verdict without a measurement: a project whose provider allowance
        // we never learned is not "under quota", it is unmeasured.
        <span className={(row.quotaUsage ?? 0) > 85 ? "tabular text-crit" : "tabular"}>
          {formatPercentOrNull(row.quotaUsage, 1)}
        </span>
      ),
      sortValue: (row) => row.quotaUsage ?? -1,
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  const credentialColumns: Column<CredentialMetadata>[] = [
    {
      id: "alias",
      header: "Alias",
      cell: (row) => <code className="mono-xs text-foreground">{row.alias}</code>,
      sortValue: (row) => row.alias,
    },
    { id: "secret", header: "Segredo", cell: () => <MaskedSecret /> },
    {
      id: "application",
      header: "Aplicação",
      cell: (row) => <span className="text-sm">{row.applicationName}</span>,
      sortValue: (row) => row.applicationName,
    },
    {
      id: "rotated",
      header: "Última rotação",
      cell: (row) => <span className="mono-xs">{formatRelativeOrNull(row.lastRotatedAt)}</span>,
      sortValue: (row) => row.lastRotatedAt ?? "",
      align: "right",
    },
    {
      id: "used",
      header: "Último uso",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">
          {formatRelativeOrNull(row.lastUsedAt)}
        </span>
      ),
      sortValue: (row) => row.lastUsedAt ?? "",
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="providers:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setRotating(row);
            }}
          >
            Rotacionar
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={provider?.name ?? "Provedor"}
        description="Todas as chamadas a este provedor são intermediadas pela plataforma. As credenciais são armazenadas no servidor e apenas seus metadados são expostos aqui."
        meta={provider ? <StatusBadge status={provider.status} /> : undefined}
        actions={<TimeRangeSelect value={range} onChange={setRange} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Requisições 24h"
          value={provider ? formatCompact(provider.requests24h) : "—"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Erros 24h"
          value={provider ? formatNumber(provider.errors24h) : "—"}
          tone={provider && provider.errors24h > 0 ? "warn" : "ok"}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="p95 upstream"
          value={formatMsOrNull(provider?.p95Ms ?? null)}
          isLoading={providers.isLoading}
        />
        <MetricCard
          label="Último sucesso"
          value={provider ? formatRelativeOrNull(provider.lastSuccessAt) : "—"}
          isLoading={providers.isLoading}
        />
      </div>

      <ChartPanel
        title="Latência upstream"
        description="Medida na fronteira da chamada de saída, excluindo o processamento da plataforma."
        isLoading={series.isLoading}
        error={series.error ?? undefined}
        isEmpty={(series.data?.length ?? 0) === 0}
        height={240}
      >
        <TimeSeriesChart
          data={series.data ?? []}
          series={[{ key: "value", label: "Latência do provedor" }]}
          variant="line"
          unit="ms"
        />
      </ChartPanel>

      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projetos</TabsTrigger>
          <TabsTrigger value="credentials">Credenciais</TabsTrigger>
          <TabsTrigger value="policy">Política</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4 space-y-3">
          <SectionTitle
            title="Projetos do provedor"
            description="Cada ambiente SaaS mapeia para um projeto upstream isolado."
          />
          <DataTable
            data={projects.data}
            columns={projectColumns}
            rowKey={(row) => row.id}
            isLoading={projects.isLoading}
            error={projects.error ?? undefined}
            searchPlaceholder="Pesquisar projeto ou aplicação…"
            searchValue={(row) => `${row.project} ${row.applicationName}`}
            pageSize={10}
          />
        </TabsContent>

        <TabsContent value="credentials" className="mt-4 space-y-3">
          <SectionTitle
            title="Metadados de credenciais"
            description="A rotação é enviada como operação; o backend realiza a troca e invalida o segredo anterior."
          />
          <DataTable
            data={credentials.data}
            columns={credentialColumns}
            rowKey={(row) => row.id}
            isLoading={credentials.isLoading}
            error={credentials.error ?? undefined}
            pageSize={10}
          />
        </TabsContent>

        <TabsContent value="policy" className="mt-4">
          <section className="panel p-4">
            <h3 className="text-sm font-semibold">Política de integração</h3>
            <dl className="mt-2">
              <StatRow
                label="Posse da credencial"
                value="Somente plataforma — nunca exposta aos consumidores"
              />
              <StatRow
                label="Isolamento de falhas"
                value="Erros de provedor excluídos do SLO da plataforma"
              />
              <StatRow
                label="Estratégia de repetição"
                value="Controlada pelo backend (provisório)"
              />
              <StatRow label="Projetos" value={provider?.projects ?? "—"} />
              <StatRow label="Credenciais" value={provider?.credentials ?? "—"} />
            </dl>
          </section>
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={rotating !== null}
        onOpenChange={(open) => {
          if (!open) setRotating(null);
        }}
        title="Rotacionar credencial do provedor"
        warning="Um novo segredo é emitido e o anterior é invalidado. Os consumidores não precisam de alterações porque a plataforma intermedia todas as chamadas, mas sessões upstream em andamento podem falhar uma vez."
        details={
          rotating
            ? [
                { label: "Alias", value: rotating.alias },
                { label: "Aplicação", value: rotating.applicationName },
                { label: "Ambiente", value: rotating.environment },
              ]
            : undefined
        }
        confirmLabel="Rotacionar credencial"
        requireTypedValue={rotating?.alias}
        environmentNotice="A operação é autorizada e auditada no servidor."
        onConfirm={async () => {
          if (!rotating) return;
          await action.mutateAsync({
            action: "provider-credential.rotate",
            resourceId: rotating.id,
          });
          setRotating(null);
        }}
      />
    </div>
  );
}
