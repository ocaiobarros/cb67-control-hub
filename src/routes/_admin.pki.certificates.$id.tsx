import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { CopyButton, IdentifierCell } from "@/components/common/copy-button";
import { CERTIFICATE_KIND_LABEL } from "@/types";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { ActivityTimeline, type TimelineItem } from "@/components/common/activity-timeline";
import { EmptyState } from "@/components/common/empty-state";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { daysUntil, formatDate, formatDateTime } from "@/utils/format";

export const Route = createFileRoute("/_admin/pki/certificates/$id")({
  head: () => ({
    meta: [
      { title: "Registro de Certificado — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Registro de certificado com cadeia de emissores, fingerprint, janela de validade, cliente vinculado e controles de rotação ou revogação.",
      },
      { property: "og:title", content: "Registro de Certificado — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Fingerprint, cadeia, validade e controles de revogação.",
      },
    ],
  }),
  component: CertificateDetail,
});

function CertificateDetail() {
  const { id } = Route.useParams();
  const certificate = useQuery(q.certificate(id));
  // Narrowed to this certificate: the trail is bounded, so an unfiltered
  // fetch stops containing an older record's history.
  const audit = useQuery(q.auditEvents(id));
  const action = useAdminAction();
  const [pending, setPending] = useState<"rotate" | "revoke" | null>(null);

  const record = certificate.data;

  const timeline: TimelineItem[] = (audit.data ?? [])
    .filter((event) =>
      record ? event.resourceId === record.id || event.resourceId === record.serial : false,
    )
    .slice(0, 10)
    .map((event) => ({
      id: event.id,
      at: event.timestamp,
      title: event.action,
      detail: `${event.actor} · ${event.source}`,
      status: event.result,
    }));

  if (certificate.isError) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Certificado indisponível"
          description="Não foi possível carregar o registro do certificado."
        />
        <EmptyState
          message="Certificado não encontrado"
          hint="Verifique o identificador e tente novamente."
        />
      </div>
    );
  }

  const remaining = record ? daysUntil(record.expiresAt) : 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={record?.subject ?? "Certificado"}
        description="A rotação emite um novo certificado para o mesmo sujeito e mantém o anterior válido até sua expiração. A revogação é imediata e irreversível."
        meta={record ? <StatusBadge status={record.status} /> : undefined}
        actions={
          <Permitted permission="pki.write">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPending("rotate")}>
                Rotacionar
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
          label="Validade restante"
          value={record ? `${Math.max(0, remaining)} dias` : "—"}
          tone={remaining <= 0 ? "crit" : remaining <= 30 ? "warn" : "ok"}
          isLoading={certificate.isLoading}
        />
        <MetricCard
          label="Tipo"
          // The raw enum stood here — "client" beside four values in
          // Portuguese, which reads as an untranslated leak of the database.
          value={record ? CERTIFICATE_KIND_LABEL[record.type] : "—"}
          isLoading={certificate.isLoading}
        />
        <MetricCard
          label="Emitido"
          value={record ? formatDate(record.issuedAt) : "—"}
          isLoading={certificate.isLoading}
        />
        <MetricCard
          label="Expira"
          value={record ? formatDate(record.expiresAt) : "—"}
          isLoading={certificate.isLoading}
        />
      </div>

      {/*
        The certificate itself, so the operator can deploy what they issued.
        Issuance used to complete and leave them with a key at a path and no way
        to obtain the certificate that goes with it — the browser test had to
        read PostgreSQL, which should have been the tell.

        The PRIVATE KEY is deliberately not here and never will be: it is
        written by the signing service to a file on the host, which is what the
        rotation policy on this screen means by "as chaves nunca transitam pela
        interface".
      */}
      {record?.certificatePem && (
        <section className="panel p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Certificado</h3>
            <div className="flex gap-2">
              <CopyButton value={record.certificatePem} label="certificado" />
              {record.chainPem && (
                <CopyButton
                  value={record.certificatePem + record.chainPem}
                  label="certificado com a cadeia"
                />
              )}
            </div>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Copie o certificado, ou o certificado com a cadeia para apresentar na conexão. A chave
            privada não passa por esta interface: o serviço assinante a deixa no servidor para
            coleta.
          </p>
          <pre className="mono-xs mt-3 max-h-56 overflow-auto rounded-md border border-border bg-muted/40 p-3">
            {record.certificatePem}
          </pre>
        </section>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Registro do certificado</h3>
          <dl className="mt-2">
            <StatRow label="Sujeito" value={record?.subject ?? "—"} />
            <StatRow label="Emissor" value={record?.issuer ?? "—"} />
            <StatRow
              label="Número de série"
              value={record ? <IdentifierCell value={record.serial} label="serial" /> : "—"}
            />
            <StatRow
              label="Fingerprint (SHA-256)"
              value={
                record ? <IdentifierCell value={record.fingerprint} label="fingerprint" /> : "—"
              }
            />
            <StatRow
              label="Cliente vinculado"
              value={record ? <IdentifierCell value={record.clientId} label="client id" /> : "—"}
            />
            <StatRow
              label="Validade"
              value={
                record
                  ? `${formatDateTime(record.issuedAt)} → ${formatDateTime(record.expiresAt)}`
                  : "—"
              }
            />
          </dl>
        </section>
        <section className="panel p-4">
          <h3 className="text-sm font-semibold">Atividade do certificado</h3>
          <div className="mt-3">
            <ActivityTimeline items={timeline} />
          </div>
        </section>
      </div>

      <ConfirmActionDialog
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        title={pending === "revoke" ? "Revogar certificado" : "Rotacionar certificado"}
        warning={
          pending === "revoke"
            ? "O certificado é adicionado imediatamente à lista de revogação. Qualquer conexão mTLS que o apresente é rejeitada, o que interromperá o cliente vinculado até que um novo certificado seja instalado."
            : "Um certificado substituto é emitido para o mesmo sujeito. O cliente deve instalá-lo antes que o certificado atual expire."
        }
        details={
          record
            ? [
                { label: "Sujeito", value: record.subject },
                { label: "Número de série", value: record.serial },
                { label: "Cliente vinculado", value: record.clientId },
              ]
            : undefined
        }
        confirmLabel={pending === "revoke" ? "Revogar certificado" : "Rotacionar certificado"}
        requireTypedValue={pending === "revoke" ? record?.serial : undefined}
        environmentNotice="Operações de PKI são reautorizadas e auditadas no servidor."
        onConfirm={async () => {
          if (!record || !pending) return;
          await action.mutateAsync({
            action: pending === "revoke" ? "certificate.revoke" : "certificate.rotate",
            resourceId: record.id,
          });
          setPending(null);
        }}
      />
    </div>
  );
}
