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
import { formatDate, formatDateTime, formatRelative } from "@/utils/format";
import { CERTIFICATE_KIND_LABEL } from "@/types";
import type { Certificate, Revocation } from "@/types";

export const Route = createFileRoute("/_admin/pki/revocation")({
  head: () => ({
    meta: [
      { title: "Revogação de Certificados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Lista de revogação de certificados com números de série revogados, motivos e os controles para revogar um certificado ativo.",
      },
      { property: "og:title", content: "Revogação de Certificados — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Lista de revogação e controles de revogação imediata.",
      },
    ],
  }),
  component: RevocationPage,
});

function RevocationPage() {
  const certificates = useQuery(q.certificates());
  const revocations = useQuery(q.revocations());
  const action = useAdminAction();
  const [target, setTarget] = useState<Certificate | null>(null);

  const all = certificates.data ?? [];
  const revoked = all.filter((row) => row.status === "revoked");
  const active = all.filter((row) => row.status === "active");
  const ledger = (revocations.data ?? []).filter((row) => row.type === "certificate");

  const revokedColumns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Sujeito",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.serial}</code>
        </div>
      ),
      sortValue: (row) => row.subject,
    },
    {
      id: "client",
      header: "Cliente vinculado",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
    },
    {
      id: "expires",
      header: "Expiração original",
      cell: (row) => <span className="mono-xs">{formatDate(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  const activeColumns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Sujeito",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.subject}</p>
          <code className="mono-xs text-muted-foreground">{row.serial}</code>
        </div>
      ),
      sortValue: (row) => row.subject,
    },
    {
      id: "type",
      header: "Tipo",
      cell: (row) => (
        <span className="text-xs text-muted-foreground">{CERTIFICATE_KIND_LABEL[row.type]}</span>
      ),
      sortValue: (row) => row.type,
    },
    {
      id: "expires",
      header: "Expira",
      cell: (row) => <span className="mono-xs">{formatDate(row.expiresAt)}</span>,
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "actions",
      header: "",
      cell: (row) => (
        <Permitted permission="pki.write">
          <Button
            variant="destructive"
            size="sm"
            onClick={(event) => {
              event.stopPropagation();
              setTarget(row);
            }}
          >
            Revogar
          </Button>
        </Permitted>
      ),
      align: "right",
    },
  ];

  const ledgerColumns: Column<Revocation>[] = [
    {
      id: "object",
      header: "Número de série",
      cell: (row) => <code className="mono-xs text-foreground">{row.object}</code>,
      sortValue: (row) => row.object,
    },
    {
      id: "reason",
      header: "Motivo",
      cell: (row) => <p className="max-w-md text-sm">{row.reason}</p>,
    },
    {
      id: "actor",
      header: "Ator",
      cell: (row) => <span className="mono-xs text-muted-foreground">{row.actor}</span>,
    },
    {
      id: "createdAt",
      header: "Registrado",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.createdAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.createdAt)}</p>
        </div>
      ),
      sortValue: (row) => row.createdAt,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Revogação de Certificados"
        description="A revogação é imediata e irreversível. A lista de revogação é publicada em todo terminador mTLS para que números de série rejeitados parem de se autenticar no próximo handshake."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Certificados revogados"
          value={revoked.length}
          tone={revoked.length > 0 ? "crit" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Certificados ativos"
          value={active.length}
          tone="ok"
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Entradas do registro"
          value={ledger.length}
          isLoading={revocations.isLoading}
        />
        <MetricCard
          label="Última revogação"
          value={ledger[0] ? formatRelative(ledger[0].createdAt) : "—"}
          isLoading={revocations.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Distribuição</h3>
        <dl className="mt-2">
          <StatRow
            label="Publicação"
            value="Lista de revogação servida pela autoridade certificadora interna"
          />
          <StatRow label="Propagação" value="Aplicada no próximo handshake TLS" />
          <StatRow
            label="Reversibilidade"
            value="Nenhuma — um certificado substituto deve ser emitido"
          />
        </dl>
      </section>

      <div className="space-y-3">
        <SectionTitle
          title="Registro de revogação"
          description="Somente entradas de certificados."
        />
        <DataTable
          data={ledger}
          columns={ledgerColumns}
          rowKey={(row) => row.id}
          isLoading={revocations.isLoading}
          error={revocations.error ?? undefined}
          emptyMessage="Nenhuma revogação de certificado registrada."
          dense
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Certificados revogados"
          description="Números de série rejeitados na fronteira mTLS."
        />
        <DataTable
          data={revoked}
          columns={revokedColumns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          emptyMessage="Nenhum certificado revogado."
          dense
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Revogar um certificado ativo"
          description="Use isto apenas quando uma chave privada for suspeita de comprometimento ou o cliente vinculado for descomissionado."
        />
        <DataTable
          data={active}
          columns={activeColumns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          searchPlaceholder="Pesquisar sujeito ou número de série…"
          searchValue={(row) => `${row.subject} ${row.serial} ${row.clientId}`}
          pageSize={10}
        />
      </div>

      <ConfirmActionDialog
        open={target !== null}
        onOpenChange={(open) => {
          if (!open) setTarget(null);
        }}
        title="Revogar certificado"
        warning="O número de série é publicado imediatamente na lista de revogação. O cliente vinculado falhará na autenticação mTLS até que um novo certificado seja emitido e instalado."
        details={
          target
            ? [
                { label: "Sujeito", value: target.subject },
                { label: "Número de série", value: target.serial },
                { label: "Cliente vinculado", value: target.clientId },
              ]
            : undefined
        }
        confirmLabel="Revogar certificado"
        requireTypedValue={target?.serial}
        environmentNotice="A operação é reautorizada e auditada no servidor."
        onConfirm={async () => {
          if (!target) return;
          await action.mutateAsync({ action: "certificate.revoke", resourceId: target.id });
          setTarget(null);
        }}
      />
    </div>
  );
}
