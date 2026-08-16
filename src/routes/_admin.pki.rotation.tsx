import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ConfirmActionDialog } from "@/components/common/confirm-action-dialog";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { daysUntil, formatDate } from "@/utils/format";
import type { Certificate } from "@/types";

export const Route = createFileRoute("/_admin/pki/rotation")({
  head: () => ({
    meta: [
      { title: "Rotação de Certificados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Planejamento de rotação para a PKI interna: quais certificados reemitir a seguir e a política operacional que rege a troca.",
      },
      { property: "og:title", content: "Rotação de Certificados — CB67 Labs Control Center" },
      { property: "og:description", content: "Candidatos a rotação e política de reemissão." },
    ],
  }),
  component: RotationPage,
});

const POLICY = [
  { label: "Tempo de vida do certificado de cliente", value: "12 meses (provisório)" },
  { label: "Tempo de vida do certificado de servidor", value: "6 meses (provisório)" },
  { label: "Janela de rotação", value: "30 dias antes da expiração" },
  { label: "Sobreposição", value: "O certificado anterior permanece válido até a expiração" },
  { label: "Geração de chaves", value: "Realizada pelo host emissor; as chaves nunca transitam pela interface" },
];

function RotationPage() {
  const certificates = useQuery(q.certificates());
  const action = useAdminAction();
  const [target, setTarget] = useState<Certificate | null>(null);

  const rows = (certificates.data ?? []).filter((row) => row.status !== "revoked");
  const candidates = rows.filter((row) => daysUntil(row.expiresAt) <= 60);

  const columns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Sujeito",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.clientId}</code>
        </div>
      ),
      sortValue: (row) => row.subject,
    },
    {
      id: "type",
      header: "Tipo",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.type}</span>,
      sortValue: (row) => row.type,
    },
    {
      id: "remaining",
      header: "Restante",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <span className={days <= 7 ? "tabular text-crit" : days <= 30 ? "tabular text-warn" : "tabular"}>
            {days <= 0 ? "expirado" : `${days} dias`}
          </span>
        );
      },
      sortValue: (row) => daysUntil(row.expiresAt),
      align: "right",
    },
    {
      id: "expires",
      header: "Expira",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatDate(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
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
        <Permitted permission="pki:write">
          <Button
            variant="outline"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
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
        title="Rotação de Certificados"
        description="A rotação é uma operação aditiva: um novo certificado é emitido enquanto o atual permanece válido, dando aos clientes uma janela para instalá-lo sem indisponibilidade."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Certificados rotacionáveis" value={rows.length} isLoading={certificates.isLoading} />
        <MetricCard
          label="Dentro da janela de rotação"
          value={candidates.length}
          tone={candidates.length > 0 ? "warn" : "ok"}
          hint="60 dias ou menos restantes"
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Certificados de cliente"
          value={rows.filter((row) => row.type === "client").length}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Certificados de servidor"
          value={rows.filter((row) => row.type === "server").length}
          isLoading={certificates.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Política de rotação</h3>
        <dl className="mt-2">
          {POLICY.map((entry) => (
            <StatRow key={entry.label} label={entry.label} value={entry.value} />
          ))}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          Os tempos de vida são provisórios até que a configuração da autoridade certificadora seja publicada pela
          equipe de backend.
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Candidatos à rotação"
          description="Certificados dentro da janela de rotação, expiração mais próxima primeiro."
        />
        <DataTable
          data={[...candidates].sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt))}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          emptyMessage="Nenhum certificado está dentro da janela de rotação."
          searchPlaceholder="Buscar sujeito ou cliente…"
          searchValue={(row) => `${row.subject} ${row.clientId}`}
          pageSize={15}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Rotacionar certificado"
        warning="Um certificado substituto é emitido para o mesmo sujeito. O cliente vinculado deve instalá-lo antes que o certificado atual expire, caso contrário a autenticação mTLS falhará."
        details={
          target
            ? [
                { label: "Sujeito", value: target.subject },
                { label: "Número de série", value: target.serial },
                { label: "Expira", value: formatDate(target.expiresAt) },
              ]
            : undefined
        }
        confirmLabel="Rotacionar certificado"
        destructive={false}
        environmentNotice="A emissão ocorre no host da autoridade certificadora e é registrada na trilha de auditoria."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "certificate.rotate", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
