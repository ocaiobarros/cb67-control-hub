import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline, type TimelineItem } from "@/components/common/activity-timeline";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import {
  daysUntil,
  formatDate,
  formatDateTime,
  formatRelative,
  formatRelativeOrNull,
} from "@/utils/format";
import type { Installation, Lease } from "@/types";

export const Route = createFileRoute("/_admin/licensing/licenses/$id")({
  head: () => ({
    meta: [
      { title: "Registro de Licença — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registro de licença com direitos do plano, instalações vinculadas, concessões emitidas e controles de revogação.",
      },
      { property: "og:title", content: "Registro de Licença — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Direitos, instalações, concessões e trilha de auditoria.",
      },
    ],
  }),
  component: LicenseDetail,
});

function LicenseDetail() {
  const { id } = Route.useParams();
  const license = useQuery(q.license(id));
  const installations = useQuery(q.installations());
  const leases = useQuery(q.leases());
  const audit = useQuery(q.auditEvents());
  const action = useAdminAction();
  const [pending, setPending] = useState<"suspend" | "revoke" | null>(null);

  const record = license.data;
  const bound = (installations.data ?? []).filter((row) => row.licenseKey === record?.key);
  const issued = (leases.data ?? []).filter((row) => row.licenseKey === record?.key);

  const timeline: TimelineItem[] = (audit.data ?? [])
    .filter((event) =>
      record ? event.resourceId === record.id || event.resourceId === record.key : false,
    )
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: event.action,
      detail: `${event.actor} · ${event.source}`,
      status: event.result,
    }));

  if (license.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Licença indisponível"
          description="O registro de licença não pôde ser carregado."
        />
        <EmptyState
          message="Licença não encontrada"
          hint="Verifique o identificador e tente novamente."
        />
      </div>
    );
  }

  const installationColumns: Column<Installation>[] = [
    {
      id: "installation",
      header: "Instalação",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    {
      id: "version",
      header: "Versão",
      cell: (row) => <code className="mono-xs">{row.version}</code>,
      sortValue: (row) => row.version,
    },
    {
      id: "lastSeen",
      header: "Visto por último",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelativeOrNull(row.lastSeen)}</span>
      ),
      sortValue: (row) => row.lastSeen ?? "",
      align: "right",
    },
    {
      id: "grace",
      header: "Carência até",
      cell: (row) => (
        <span className="mono-xs">{row.graceUntil ? formatDateTime(row.graceUntil) : "—"}</span>
      ),
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

  const leaseColumns: Column<Lease>[] = [
    {
      id: "lease",
      header: "Concessão",
      cell: (row) => <IdentifierCell value={row.leaseId} label="lease id" />,
      sortValue: (row) => row.leaseId,
    },
    {
      id: "installation",
      header: "Instalação",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.installationId}</code>,
    },
    {
      id: "issued",
      header: "Emitida",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.issuedAt)}</span>,
      sortValue: (row) => row.issuedAt,
      align: "right",
    },
    {
      id: "expires",
      header: "Expira",
      cell: (row) => <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "keyId",
      header: "Chave de assinatura",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.keyId}</code>,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      sortValue: (row) => row.status,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={record?.key ?? "Licença"}
        description="As concessões são de curta duração e assinadas; suspender ou revogar uma licença tem efeito na próxima renovação da instalação, ou imediatamente se ela estiver on-line."
        meta={record ? <StatusBadge status={record.status} /> : undefined}
        actions={
          <Permitted permission="licensing.write">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending("suspend")}>
                Suspender
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setPending("revoke")}>
                Revogar
              </Button>
            </div>
          </Permitted>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Instalações"
          value={record ? `${record.installations} / ${record.maxInstallations}` : "—"}
          tone={record && record.installations >= record.maxInstallations ? "warn" : "neutral"}
          isLoading={license.isLoading}
        />
        <MetricCard
          label="Validade restante"
          value={record ? `${Math.max(0, daysUntil(record.expiresAt))} dias` : "—"}
          tone={record && daysUntil(record.expiresAt) <= 30 ? "warn" : "ok"}
          isLoading={license.isLoading}
        />
        <MetricCard
          label="Concessões ativas"
          value={issued.filter((row) => row.status === "valid").length}
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Última validação"
          value={formatRelativeOrNull(record?.lastValidationAt ?? null)}
          isLoading={license.isLoading}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className="panel p-4 xl:col-span-2">
          <h3 className="text-sm font-semibold">Registro da licença</h3>
          <dl className="mt-2">
            <StatRow label="Cliente" value={record?.customerName ?? "—"} />
            <StatRow label="Produto" value={record?.productName ?? "—"} />
            <StatRow label="Plano" value={record?.plan ?? "—"} />
            <StatRow
              label="Validade"
              value={
                record ? `${formatDate(record.startsAt)} → ${formatDate(record.expiresAt)}` : "—"
              }
            />
            <StatRow
              label="Chave de licença"
              value={record ? <IdentifierCell value={record.key} label="licence key" /> : "—"}
            />
          </dl>
        </section>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Recursos habilitados</h3>
          <ul className="mt-2 space-y-1">
            {(record?.features ?? []).map((feature) => (
              <li key={feature} className="flex items-center justify-between gap-2 text-sm">
                <code className="mono-xs">{feature}</code>
                <StatusBadge status="active" label="concedido" />
              </li>
            ))}
            {(record?.features.length ?? 0) === 0 && !license.isLoading && (
              <li className="text-xs text-muted-foreground">
                Nenhum recurso associado a este plano.
              </li>
            )}
          </ul>
        </section>
      </div>

      <Tabs defaultValue="installations">
        <TabsList>
          <TabsTrigger value="installations">Instalações</TabsTrigger>
          <TabsTrigger value="leases">Concessões</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
        </TabsList>
        <TabsContent value="installations" className="mt-4 space-y-3">
          <SectionTitle
            title="Instalações vinculadas"
            description="Cada instalação consome um assento."
          />
          <DataTable
            data={bound}
            columns={installationColumns}
            rowKey={(row) => row.id}
            isLoading={installations.isLoading}
            error={installations.error ?? undefined}
            dense
          />
        </TabsContent>
        <TabsContent value="leases" className="mt-4 space-y-3">
          <SectionTitle
            title="Concessões emitidas"
            description="Autorizações assinadas e de curta duração para execução."
          />
          <DataTable
            data={issued}
            columns={leaseColumns}
            rowKey={(row) => row.id}
            isLoading={leases.isLoading}
            error={leases.error ?? undefined}
            dense
          />
        </TabsContent>
        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline items={timeline} />
        </TabsContent>
      </Tabs>

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === "revoke" ? "Revogar licença" : "Suspender licença"}
        warning={
          pending === "revoke"
            ? "A revogação é permanente. Toda instalação vinculada deixa de receber concessões e a chave de licença nunca poderá ser reativada."
            : "A suspensão bloqueia a emissão de novas concessões. As instalações continuam funcionando até que a concessão atual expire."
        }
        details={
          record
            ? [
                { label: "Licença", value: record.key },
                { label: "Cliente", value: record.customerName },
                { label: "Instalações", value: `${record.installations}` },
              ]
            : undefined
        }
        confirmLabel={pending === "revoke" ? "Revogar licença" : "Suspender licença"}
        requireTypedValue={pending === "revoke" ? record?.key : undefined}
        environmentNotice="O backend reverifica a autorização e registra a operação na trilha de auditoria."
        onConfirm={async () => {
          if (!record || !pending) return;
          await action.mutateAsync({
            action: pending === "revoke" ? "license.revoke" : "license.suspend",
            resourceId: record.id,
          });
          setPending(null);
        }}
      />
    </div>
  );
}
