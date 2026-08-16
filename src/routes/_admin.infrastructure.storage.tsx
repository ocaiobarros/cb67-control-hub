import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { ChartPanel, DonutChart } from "@/components/charts/chart-panel";
import { UsageCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { Progress } from "@/components/ui/progress";
import { formatBytes, formatPercent } from "@/utils/format";
import type { Host } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/storage")({
  head: () => ({
    meta: [
      { title: "Armazenamento — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Consumo de disco por categoria e por host, incluindo crescimento de banco de dados, backup e logs para a plataforma CB67 Labs.",
      },
      { property: "og:title", content: "Armazenamento — CB67 Labs Control Center" },
      { property: "og:description", content: "Consumo de disco por categoria e por host." },
    ],
  }),
  component: StoragePage,
});

function StoragePage() {
  const breakdown = useQuery(q.storageBreakdown());
  const hosts = useQuery(q.hosts());
  const database = useQuery(q.databaseHealth());

  const columns: Column<Host>[] = [
    {
      id: "name",
      header: "Host",
      cell: (row) => <span className="font-medium">{row.name}</span>,
      sortValue: (r) => r.name,
    },
    { id: "role", header: "Função", cell: (row) => <span className="mono-xs">{row.role}</span> },
    {
      id: "storage",
      header: "Disco usado",
      cell: (row) => (
        <div className="flex min-w-32 items-center gap-2">
          <Progress value={row.storage} className="h-1.5" />
          <span className="tabular w-12 text-right text-xs text-muted-foreground">
            {formatPercent(row.storage, 0)}
          </span>
        </div>
      ),
      sortValue: (row) => row.storage,
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <StatusBadge status={row.status} />,
      align: "right",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Armazenamento"
        description="Alocação de disco em toda a plataforma. Os volumes de backup e logs são as categorias que mais crescem e devem ser revisados conforme a política de retenção."
      />

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartPanel
            title="Consumo por categoria"
            description="Participação na capacidade total provisionada."
            isLoading={breakdown.isLoading}
            error={breakdown.error ?? undefined}
            isEmpty={breakdown.data?.length === 0}
            height={260}
          >
            <DonutChart data={breakdown.data ?? []} />
          </ChartPanel>
        </div>
        <div className="space-y-3">
          <UsageCard
            label="Tamanho do banco de dados"
            used={database.data?.sizeBytes ?? 0}
            total={512 * 1024 ** 3}
            formatValue={formatBytes}
            hint="Volume provisionado para PostgreSQL"
          />
          <UsageCard
            label="Disco do cluster"
            used={hosts.data?.reduce((sum, host) => sum + host.storage, 0) ?? 0}
            total={(hosts.data?.length ?? 1) * 100}
            formatValue={(value) => formatPercent(value, 0)}
            hint="Soma do uso por host"
          />
        </div>
      </div>

      <DataTable
        data={hosts.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={hosts.isLoading}
        error={hosts.error ?? undefined}
        searchPlaceholder="Pesquisar hosts…"
      />
    </div>
  );
}
