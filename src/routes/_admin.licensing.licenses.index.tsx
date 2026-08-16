import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { daysUntil, formatDate, formatNumber, formatRelative } from "@/utils/format";
import type { License } from "@/types";

export const Route = createFileRoute("/_admin/licensing/licenses/")({
  head: () => ({
    meta: [
      { title: "Licenças — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Licenças emitidas pela CB67 Labs com plano, janela de validade, consumo de instalações e carimbo de data/hora da última validação.",
      },
      { property: "og:title", content: "Licenças — CB67 Labs Control Center" },
      { property: "og:description", content: "Validade, instalações e atividade de validação." },
    ],
  }),
  component: LicensesPage,
});

function LicensesPage() {
  const licenses = useQuery(q.licenses());
  const navigate = useNavigate();
  const rows = licenses.data ?? [];

  const columns: Column<License>[] = [
    {
      id: "key",
      header: "Chave de licença",
      cell: (row) => (
        <div className="min-w-0">
          <code className="mono-xs text-foreground">{row.key}</code>
          <p className="text-xs text-muted-foreground">{row.customerName}</p>
        </div>
      ),
      sortValue: (row) => row.key,
    },
    {
      id: "product",
      header: "Produto",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.productName}</p>
          <span className="mono-xs text-muted-foreground">{row.plan}</span>
        </div>
      ),
      sortValue: (row) => row.productName,
    },
    {
      id: "validity",
      header: "Validade",
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDate(row.startsAt)} → {formatDate(row.expiresAt)}</span>
          <p
            className={
              daysUntil(row.expiresAt) <= 0
                ? "mono-xs text-crit"
                : daysUntil(row.expiresAt) <= 30
                  ? "mono-xs text-warn"
                  : "mono-xs text-muted-foreground"
            }
          >
            {daysUntil(row.expiresAt) <= 0
              ? "expirada"
              : `${daysUntil(row.expiresAt)} dias restantes`}
          </p>
        </div>
      ),
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "installations",
      header: "Instalações",
      cell: (row) => (
        <span
          className={
            row.installations >= row.maxInstallations ? "tabular text-warn" : "tabular"
          }
        >
          {row.installations} / {row.maxInstallations}
        </span>
      ),
      sortValue: (row) => row.installations / Math.max(1, row.maxInstallations),
      align: "right",
    },
    {
      id: "validation",
      header: "Última validação",
      cell: (row) => (
        <span className="mono-xs text-muted-foreground">{formatRelative(row.lastValidationAt)}</span>
      ),
      sortValue: (row) => row.lastValidationAt,
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

  const expiring = rows.filter(
    (row) => daysUntil(row.expiresAt) > 0 && daysUntil(row.expiresAt) <= 30,
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Licenças"
        description="Uma licença vincula um cliente e um produto a um plano e um teto de instalações. Selecione uma linha para inspecionar instalações, concessões e histórico de revogações."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Licenças" value={rows.length} isLoading={licenses.isLoading} />
        <MetricCard
          label="Ativas"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={licenses.isLoading}
        />
        <MetricCard
          label="Expirando em 30d"
          value={expiring.length}
          tone={expiring.length > 0 ? "warn" : "ok"}
          isLoading={licenses.isLoading}
        />
        <MetricCard
          label="Instalações vinculadas"
          value={formatNumber(rows.reduce((sum, row) => sum + row.installations, 0))}
          isLoading={licenses.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle title="Licenças emitidas" description="Clique em uma licença para abrir o registro." />
        <DataTable
          data={licenses.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={licenses.isLoading}
          error={licenses.error ?? undefined}
          searchPlaceholder="Buscar chave, cliente ou produto…"
          searchValue={(row) => `${row.key} ${row.customerName} ${row.productName} ${row.plan}`}
          pageSize={15}
          onRowClick={(row) => {
            void navigate({ to: `/licensing/licenses/${row.id}` as never });
          }}
        />
      </div>
    </div>
  );
}
