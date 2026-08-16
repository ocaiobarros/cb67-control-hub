import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { daysUntil, formatDate } from "@/utils/format";
import type { Certificate } from "@/types";

export const Route = createFileRoute("/_admin/pki/certificates/")({
  head: () => ({
    meta: [
      { title: "Certificados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Inventário interno de PKI: certificados de cliente, servidor e intermediários com emissor, número de série, fingerprint e validade.",
      },
      { property: "og:title", content: "Certificados — CB67 Labs Control Center" },
      { property: "og:description", content: "Inventário de certificados mTLS e estado de validade." },
    ],
  }),
  component: CertificatesPage,
});

const TYPE_LABEL: Record<Certificate["type"], string> = {
  client: "Cliente",
  server: "Servidor",
  intermediate: "Intermediário",
};

function CertificatesPage() {
  const certificates = useQuery(q.certificates());
  const navigate = useNavigate();
  const rows = certificates.data ?? [];

  const expiring = rows.filter(
    (row) => daysUntil(row.expiresAt) > 0 && daysUntil(row.expiresAt) <= 30,
  );

  const byType = (Object.keys(TYPE_LABEL) as Certificate["type"][]).map((type) => ({
    t: TYPE_LABEL[type],
    value: rows.filter((row) => row.type === type).length,
  }));

  const columns: Column<Certificate>[] = [
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
      cell: (row) => <StatusBadge status={row.type} tone="info" label={TYPE_LABEL[row.type]} />,
      sortValue: (row) => row.type,
    },
    {
      id: "client",
      header: "Cliente vinculado",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
      sortValue: (row) => row.clientId,
    },
    {
      id: "issuer",
      header: "Emissor",
      cell: (row) => <span className="text-xs text-muted-foreground">{row.issuer}</span>,
      sortValue: (row) => row.issuer,
      hideByDefault: true,
    },
    {
      id: "validity",
      header: "Válido até",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <div className="text-right">
            <span className="mono-xs">{formatDate(row.expiresAt)}</span>
            <p
              className={
                days <= 0 ? "mono-xs text-crit" : days <= 30 ? "mono-xs text-warn" : "mono-xs text-muted-foreground"
              }
            >
              {days <= 0 ? "expirado" : `${days} dias`}
            </p>
          </div>
        );
      },
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
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Certificados"
        description="Todo cliente de máquina se autentica com um certificado emitido pela autoridade certificadora interna. As chaves privadas nunca saem do host emissor."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Certificados" value={rows.length} isLoading={certificates.isLoading} />
        <MetricCard
          label="Válidos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Expirando em 30d"
          value={expiring.length}
          tone={expiring.length > 0 ? "warn" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Revogados ou expirados"
          value={rows.filter((row) => row.status === "revoked" || row.status === "expired").length}
          tone="crit"
          isLoading={certificates.isLoading}
        />
      </div>

      <ChartPanel
        title="Inventário por tipo"
        description="Distribuição na hierarquia de certificados."
        isLoading={certificates.isLoading}
        error={certificates.error ?? undefined}
        isEmpty={byType.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={byType} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Inventário de certificados" description="Selecione um certificado para inspecionar seu registro completo." />
        <DataTable
          data={certificates.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          searchPlaceholder="Pesquisar sujeito, número de série ou cliente…"
          searchValue={(row) => `${row.subject} ${row.serial} ${row.clientId}`}
          pageSize={15}
          onRowClick={(row) => {
            void navigate({ to: `/pki/certificates/${row.id}` as never });
          }}
        />
      </div>
    </div>
  );
}
