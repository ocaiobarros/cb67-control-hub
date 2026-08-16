import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { ChartPanel, CategoryBarChart } from "@/components/charts/chart-panel";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Installation } from "@/types";

export const Route = createFileRoute("/_admin/licensing/installations")({
  head: () => ({
    meta: [
      { title: "Instalações — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Instalações de produtos licenciados com versão, heartbeat, vínculo de concessão e estado do período de carência.",
      },
      { property: "og:title", content: "Instalações — CB67 Labs Control Center" },
      { property: "og:description", content: "Heartbeats, versões e períodos de carência por instalação." },
    ],
  }),
  component: InstallationsPage,
});

function InstallationsPage() {
  const installations = useQuery(q.installations());
  const rows = installations.data ?? [];

  const inGrace = rows.filter((row) => row.graceUntil !== null);
  const byVersion = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.version] = (acc[row.version] ?? 0) + 1;
      return acc;
    }, {}),
  )
    .map(([t, value]) => ({ t, value }))
    .sort((a, b) => b.value - a.value);

  const columns: Column<Installation>[] = [
    {
      id: "installation",
      header: "Instalação",
      cell: (row) => <IdentifierCell value={row.installationId} label="installation id" />,
      sortValue: (row) => row.installationId,
    },
    {
      id: "product",
      header: "Produto",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm">{row.productName}</p>
          <code className="mono-xs text-muted-foreground">{row.version}</code>
        </div>
      ),
      sortValue: (row) => row.productName,
    },
    {
      id: "license",
      header: "Licença",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.licenseKey}</code>,
      sortValue: (row) => row.licenseKey,
    },
    {
      id: "lease",
      header: "Concessão",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.leaseId}</code>,
      hideByDefault: true,
    },
    {
      id: "lastSeen",
      header: "Heartbeat",
      cell: (row) => <span className="mono-xs text-muted-foreground">{formatRelative(row.lastSeen)}</span>,
      sortValue: (row) => row.lastSeen,
      align: "right",
    },
    {
      id: "grace",
      header: "Carência até",
      cell: (row) => (
        <span className={row.graceUntil ? "mono-xs text-warn" : "mono-xs text-muted-foreground"}>
          {row.graceUntil ? formatDateTime(row.graceUntil) : "—"}
        </span>
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Instalações"
        description="Uma instalação é uma instância de produto licenciado em execução no ambiente de um cliente. Instalações offline continuam operando até o fim da concessão ou da janela de carência."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Instalações" value={rows.length} isLoading={installations.isLoading} />
        <MetricCard
          label="Ativas"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={installations.isLoading}
        />
        <MetricCard
          label="Em carência"
          value={inGrace.length}
          tone={inGrace.length > 0 ? "warn" : "ok"}
          hint="Operando sem uma concessão recente"
          isLoading={installations.isLoading}
        />
        <MetricCard
          label="Versões distintas"
          value={byVersion.length}
          hint="Divergência de versões na frota"
          isLoading={installations.isLoading}
        />
      </div>

      <ChartPanel
        title="Distribuição de versões"
        description="Instalações por versão de produto."
        isLoading={installations.isLoading}
        error={installations.error ?? undefined}
        isEmpty={byVersion.length === 0}
      >
        <CategoryBarChart data={byVersion} colorByIndex />
      </ChartPanel>

      <div className="space-y-3">
        <SectionTitle title="Registro de instalações" description="Os heartbeats são reportados pelo produto instalado." />
        <DataTable
          data={installations.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={installations.isLoading}
          error={installations.error ?? undefined}
          searchPlaceholder="Buscar instalação, licença ou produto…"
          searchValue={(row) => `${row.installationId} ${row.licenseKey} ${row.productName}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
