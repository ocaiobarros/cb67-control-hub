import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { StatusBadge } from "@/components/common/status-badge";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { formatPercent } from "@/utils/format";
import type { Host } from "@/types";

export const Route = createFileRoute("/_admin/infrastructure/hosts")({
  head: () => ({
    meta: [
      { title: "Hosts — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Inventário de hosts on-premises com função, ambiente, uso e saúde para a plataforma CB67 Labs.",
      },
      { property: "og:title", content: "Hosts — CB67 Labs Control Center" },
      { property: "og:description", content: "Inventário de hosts, uso e saúde." },
    ],
  }),
  component: HostsPage,
});

function Utilisation({ value }: { value: number }) {
  return (
    <div className="flex min-w-28 items-center gap-2">
      <Progress value={value} className="h-1.5" />
      <span className="tabular w-12 text-right text-xs text-muted-foreground">
        {formatPercent(value, 0)}
      </span>
    </div>
  );
}

function HostsPage() {
  const hosts = useQuery(q.hosts());

  const columns: Column<Host>[] = [
    {
      id: "name",
      header: "Host",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <p className="mono-xs text-muted-foreground">{row.role}</p>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "environment",
      header: "Ambiente",
      cell: (row) => (
        <Badge variant="outline" className="mono-xs">
          {row.environment}
        </Badge>
      ),
      sortValue: (row) => row.environment,
    },
    {
      id: "cpu",
      header: "CPU",
      cell: (row) => <Utilisation value={row.cpu} />,
      sortValue: (row) => row.cpu,
    },
    {
      id: "memory",
      header: "Memória",
      cell: (row) => <Utilisation value={row.memory} />,
      sortValue: (row) => row.memory,
    },
    {
      id: "storage",
      header: "Armazenamento",
      cell: (row) => <Utilisation value={row.storage} />,
      sortValue: (row) => row.storage,
    },
    {
      id: "uptime",
      header: "Uptime",
      cell: (row) => <span className="mono-xs">{row.uptime}</span>,
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
        title="Hosts"
        description="Nós físicos e virtuais executando a plataforma em Proxmox. O uso é reportado pelo node exporter."
      />
      <DataTable
        data={hosts.data}
        columns={columns}
        rowKey={(row) => row.id}
        isLoading={hosts.isLoading}
        error={hosts.error ?? undefined}
        searchPlaceholder="Pesquisar hosts, funções…"
      />
    </div>
  );
}
