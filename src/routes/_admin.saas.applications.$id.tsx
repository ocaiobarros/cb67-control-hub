import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, StatRow, UsageCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { DataTable, type Column } from "@/components/common/data-table";
import { IdentifierCell } from "@/components/common/copy-button";
import { ErrorState } from "@/components/common/error-state";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline } from "@/components/common/activity-timeline";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  formatCompact,
  formatDateTime,
  formatMs,
  formatNumber,
  formatPercent,
  formatRelative,
  formatMsOrNull,
  formatPercentOrNull,
} from "@/utils/format";
import type { Instance } from "@/types";

export const Route = createFileRoute("/_admin/saas/applications/$id")({
  head: () => ({
    meta: [
      { title: "Detalhe da Aplicação — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Credenciais, escopos, cotas, instâncias e histórico de auditoria de uma aplicação SaaS registrada na plataforma CB67 Labs.",
      },
      { property: "og:title", content: "Detalhe da Aplicação — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Credenciais, escopos, cotas, instâncias e histórico de auditoria.",
      },
    ],
  }),
  component: ApplicationDetailPage,
});

function ApplicationDetailPage() {
  const { id } = Route.useParams();
  const application = useQuery(q.application(id));
  const instances = useQuery(q.instances(id));
  const audit = useQuery(q.auditEvents());
  const action = useAdminAction();
  const [pending, setPending] = useState<null | "suspend" | "rotate">(null);

  if (application.isError) {
    return <ErrorState error={application.error} onRetry={() => void application.refetch()} />;
  }

  const app = application.data;

  const instanceColumns: Column<Instance>[] = [
    {
      id: "installation",
      header: "Instalação",
      cell: (row) => <IdentifierCell value={row.installationId} label="id da instalação" />,
      sortValue: (row) => row.installationId,
    },
    {
      id: "host",
      header: "Host",
      cell: (row) => <span className="text-sm">{row.hostLabel}</span>,
      sortValue: (row) => row.hostLabel,
    },
    {
      id: "version",
      header: "Versão",
      cell: (row) => <span className="mono-xs">{row.version}</span>,
      sortValue: (row) => row.version,
    },
    {
      id: "certificate",
      header: "Certificado",
      cell: (row) => <StatusBadge status={row.certificateStatus} />,
      sortValue: (row) => row.certificateStatus,
    },
    {
      id: "lastSeen",
      header: "Visto por último",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  const timeline = (audit.data ?? [])
    .filter(
      (event) => !app || event.resourceId === app.apiClientId || event.resource === "application",
    )
    .slice(0, 8)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: `${event.action} · ${event.resource}`,
      detail: `${event.actor} de ${event.source}`,
      status: event.result,
    }));

  return (
    <div className="space-y-6">
      <PageHeader
        title={app?.name ?? "Aplicação"}
        description="Visão consolidada de um consumidor SaaS: identidade, escopos autorizados, consumo de cota, instâncias implantadas e atividade registrada."
        meta={
          app ? (
            <>
              <StatusBadge status={app.status} />
              <Badge variant="outline" className="mono-xs">
                {app.environment}
              </Badge>
            </>
          ) : null
        }
        actions={
          <Permitted permission="saas.write">
            <Button variant="outline" size="sm" onClick={() => setPending("rotate")}>
              Rotacionar credencial
            </Button>
            <Button variant="destructive" size="sm" onClick={() => setPending("suspend")}>
              Suspender acesso
            </Button>
          </Permitted>
        }
      />

      {application.isLoading || !app ? (
        <Skeleton className="h-64 w-full" />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Requisições 30d" value={formatCompact(app.requests30d)} />
            <MetricCard
              label="Taxa de erro"
              value={formatPercentOrNull(app.errorRate)}
              // No measurement, no verdict: a green card would announce a clean
              // application that has never served a request.
              tone={app.errorRate === null ? "neutral" : app.errorRate > 1 ? "warn" : "ok"}
              hint={`${formatNumber(app.errors30d)} requisições com falha`}
            />
            <MetricCard
              label="p95 / p99"
              value={`${formatMsOrNull(app.p95Ms)} / ${formatMsOrNull(app.p99Ms)}`}
            />
            <MetricCard
              label="Limitadas por taxa"
              value={formatNumber(app.rateLimited)}
              hint="respostas 429 em 30 dias"
            />
          </div>

          <Tabs defaultValue="identity">
            <TabsList>
              <TabsTrigger value="identity">Identidade</TabsTrigger>
              <TabsTrigger value="quotas">Cotas</TabsTrigger>
              <TabsTrigger value="instances">Instâncias</TabsTrigger>
              <TabsTrigger value="activity">Atividade</TabsTrigger>
            </TabsList>

            <TabsContent value="identity" className="grid gap-3 lg:grid-cols-2">
              <section className="panel p-4">
                <h2 className="pb-2 text-sm font-semibold">Identidade do cliente</h2>
                <dl>
                  <StatRow
                    label="ID do cliente de API"
                    value={<IdentifierCell value={app.apiClientId} label="id do cliente" />}
                  />
                  <StatRow
                    label="Código da aplicação"
                    value={<code className="mono-xs">{app.code}</code>}
                  />
                  <StatRow
                    label="Status da licença"
                    value={<StatusBadge status={app.licenseStatus} />}
                  />
                  <StatRow
                    label="Certificado"
                    value={
                      <span className="flex items-center gap-2">
                        <StatusBadge status={app.certificateStatus} />
                        <span className="mono-xs text-muted-foreground">
                          exp. {formatDateTime(app.certificateExpiresAt)}
                        </span>
                      </span>
                    }
                  />
                  <StatRow label="Visto por último" value={formatRelative(app.lastSeen)} />
                </dl>
                <p className="mt-3 text-xs text-muted-foreground">
                  Segredos de cliente e chaves privadas nunca são exibidos. A rotação emite novo
                  material pela PKI da plataforma e invalida a credencial anterior.
                </p>
              </section>

              <section className="panel p-4">
                <h2 className="pb-2 text-sm font-semibold">Autorização de serviços</h2>
                <div className="space-y-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Permitidos
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {app.allowedServices.map((service) => (
                        <Badge
                          key={service}
                          variant="outline"
                          className="mono-xs border-ok/40 text-ok"
                        >
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                      Bloqueados
                    </p>
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {app.blockedServices.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Nenhuma negação explícita.
                        </span>
                      ) : (
                        app.blockedServices.map((service) => (
                          <Badge
                            key={service}
                            variant="outline"
                            className="mono-xs border-crit/40 text-crit"
                          >
                            {service}
                          </Badge>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="quotas" className="grid gap-3 sm:grid-cols-2">
              <UsageCard
                label="Cota mensal"
                used={app.quotaUsed}
                total={app.monthlyQuota}
                formatValue={formatCompact}
                hint="Requisições consumidas na janela de cobrança atual"
              />
              <MetricCard
                label="Limitadas por taxa"
                value={formatNumber(app.rateLimited)}
                tone={app.rateLimited > 0 ? "warn" : "ok"}
                hint="Requisições rejeitadas com 429"
              />
            </TabsContent>

            <TabsContent value="instances">
              <DataTable
                data={instances.data}
                columns={instanceColumns}
                rowKey={(row) => row.id}
                isLoading={instances.isLoading}
                error={instances.error ?? undefined}
                searchPlaceholder="Pesquisar instalações…"
                emptyMessage="Nenhuma instância reportando para esta aplicação."
              />
            </TabsContent>

            <TabsContent value="activity" className="panel p-4">
              <ActivityTimeline items={timeline} />
            </TabsContent>
          </Tabs>
        </>
      )}

      <ConfirmActionDialog
        open={pending === "suspend"}
        onOpenChange={(open) => setPending(open ? "suspend" : null)}
        title="Suspender acesso da aplicação"
        warning="A aplicação passará a receber imediatamente respostas 403 em todos os endpoints. Instâncias em execução deixam de funcionar até o acesso ser restabelecido."
        details={[
          { label: "Aplicação", value: app?.name ?? "—" },
          { label: "ID do cliente", value: <code className="mono-xs">{app?.apiClientId}</code> },
          { label: "Instâncias afetadas", value: app?.instances ?? 0 },
        ]}
        environmentNotice={
          app?.environment === "production"
            ? "Esta aplicação roda em PRODUÇÃO. Confirme a janela de mudança antes de prosseguir."
            : undefined
        }
        requireTypedValue={app?.code}
        confirmLabel="Suspender acesso"
        onConfirm={async () => {
          await action.mutateAsync({ action: "saas.suspend", resourceId: id });
        }}
      />

      <ConfirmActionDialog
        open={pending === "rotate"}
        onOpenChange={(open) => setPending(open ? "rotate" : null)}
        title="Rotacionar credencial do cliente"
        warning="Uma nova credencial é emitida e a atual é invalidada após o período de carência definido pela política da plataforma. As instâncias precisam adotar o novo material."
        details={[
          { label: "Aplicação", value: app?.name ?? "—" },
          { label: "ID do cliente", value: <code className="mono-xs">{app?.apiClientId}</code> },
        ]}
        destructive={false}
        confirmLabel="Rotacionar credencial"
        onConfirm={async () => {
          await action.mutateAsync({ action: "saas.rotate-credential", resourceId: id });
        }}
      />
    </div>
  );
}
