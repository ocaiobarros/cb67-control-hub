import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { AppLink } from "@/components/common/app-link";
import { daysUntil, formatDate } from "@/utils/format";
import type { Certificate } from "@/types";

export const Route = createFileRoute("/_admin/pki/expiration")({
  head: () => ({
    meta: [
      { title: "Expiração de Certificados — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Horizonte de expiração da PKI interna: certificados agrupados por validade restante para agendar renovações antes do risco de interrupção.",
      },
      { property: "og:title", content: "Expiração de Certificados — CB67 Labs Control Center" },
      { property: "og:description", content: "Horizonte de renovação agrupado por validade restante." },
    ],
  }),
  component: ExpirationPage,
});

const BUCKETS = [
  { label: "Expirados", min: -Infinity, max: 0 },
  { label: "0–7 dias", min: 0, max: 7 },
  { label: "8–30 dias", min: 7, max: 30 },
  { label: "31–90 dias", min: 30, max: 90 },
  { label: "90+ dias", min: 90, max: Infinity },
];

function bucketOf(cert: Certificate) {
  const days = daysUntil(cert.expiresAt);
  return BUCKETS.find((bucket) => days > bucket.min && days <= bucket.max) ?? BUCKETS[BUCKETS.length - 1];
}

function ExpirationPage() {
  const certificates = useQuery(q.certificates());
  const rows = certificates.data ?? [];

  const chart = BUCKETS.map((bucket) => ({
    t: bucket.label,
    value: rows.filter((row) => bucketOf(row)?.label === bucket.label).length,
  }));

  const urgent = [...rows]
    .filter((row) => row.status !== "revoked")
    .sort((a, b) => daysUntil(a.expiresAt) - daysUntil(b.expiresAt));

  const columns: Column<Certificate>[] = [
    {
      id: "subject",
      header: "Sujeito",
      cell: (row) => (
        <AppLink to={`/pki/certificates/${row.id}`} className="text-sm font-medium hover:underline">
          {row.subject}
        </AppLink>
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
      id: "client",
      header: "Cliente vinculado",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.clientId}</code>,
    },
    {
      id: "remaining",
      header: "Restante",
      cell: (row) => {
        const days = daysUntil(row.expiresAt);
        return (
          <span className={days <= 0 ? "tabular text-crit" : days <= 30 ? "tabular text-warn" : "tabular"}>
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
  ];

  const expired = rows.filter((row) => daysUntil(row.expiresAt) <= 0);
  const within7 = rows.filter((row) => daysUntil(row.expiresAt) > 0 && daysUntil(row.expiresAt) <= 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Expiração de Certificados"
        description="Um certificado de cliente expirado quebra silenciosamente a autenticação mTLS. As renovações devem ser agendadas com pelo menos trinta dias de antecedência da data de expiração."
        meta={<StatusBadge status={expired.length > 0 ? "critical" : within7.length > 0 ? "warn" : "healthy"} />}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Expirados"
          value={expired.length}
          tone={expired.length > 0 ? "crit" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Próximos 7 dias"
          value={within7.length}
          tone={within7.length > 0 ? "warn" : "ok"}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Próximos 30 dias"
          value={rows.filter((row) => daysUntil(row.expiresAt) > 7 && daysUntil(row.expiresAt) <= 30).length}
          isLoading={certificates.isLoading}
        />
        <MetricCard
          label="Além de 90 dias"
          value={rows.filter((row) => daysUntil(row.expiresAt) > 90).length}
          tone="ok"
          isLoading={certificates.isLoading}
        />
      </div>

      <ChartPanel
        title="Horizonte de expiração"
        description="Certificados agrupados por validade restante."
        isLoading={certificates.isLoading}
        error={certificates.error ?? undefined}
        isEmpty={chart.every((entry) => entry.value === 0)}
      >
        <CategoryBarChart data={chart} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Fila de renovação" description="Ordenado por validade restante, certificados revogados excluídos." />
        <DataTable
          data={urgent}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={certificates.isLoading}
          error={certificates.error ?? undefined}
          searchPlaceholder="Buscar sujeito ou cliente…"
          searchValue={(row) => `${row.subject} ${row.clientId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
