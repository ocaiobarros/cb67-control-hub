import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard, StatRow } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { IdentifierCell } from "@/components/common/copy-button";
import { formatDateTime, formatRelative } from "@/utils/format";
import type { Lease } from "@/types";

export const Route = createFileRoute("/_admin/licensing/leases")({
  head: () => ({
    meta: [
      { title: "Concessões — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Concessões de licença assinadas com carimbos de emissão e expiração, instalação vinculada e a chave de assinatura utilizada.",
      },
      { property: "og:title", content: "Concessões — CB67 Labs Control Center" },
      { property: "og:description", content: "Ciclo de vida da concessão, validade e rotação de chave de assinatura." },
    ],
  }),
  component: LeasesPage,
});

function LeasesPage() {
  const leases = useQuery(q.leases());
  const rows = leases.data ?? [];

  const byKey = Object.entries(
    rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.keyId] = (acc[row.keyId] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const columns: Column<Lease>[] = [
    {
      id: "lease",
      header: "Concessão",
      cell: (row) => <IdentifierCell value={row.leaseId} label="lease id" />,
      sortValue: (row) => row.leaseId,
    },
    {
      id: "license",
      header: "Licença",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.licenseKey}</code>,
      sortValue: (row) => row.licenseKey,
    },
    {
      id: "installation",
      header: "Instalação",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.installationId}</code>,
      sortValue: (row) => row.installationId,
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
      cell: (row) => (
        <div className="text-right">
          <span className="mono-xs">{formatDateTime(row.expiresAt)}</span>
          <p className="mono-xs text-muted-foreground">{formatRelative(row.expiresAt)}</p>
        </div>
      ),
      sortValue: (row) => row.expiresAt,
      align: "right",
    },
    {
      id: "keyId",
      header: "Chave de assinatura",
      cell: (row) => <code className="mono-xs text-muted-foreground">{row.keyId}</code>,
      sortValue: (row) => row.keyId,
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
        title="Concessões"
        description="As concessões são autorizações assinadas e verificáveis offline. As instalações as renovam periodicamente; uma licença revogada simplesmente deixa de receber novas concessões."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Concessões" value={rows.length} isLoading={leases.isLoading} />
        <MetricCard
          label="Válidas"
          value={rows.filter((row) => row.status === "valid").length}
          tone="ok"
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Carência"
          value={rows.filter((row) => row.status === "grace").length}
          tone="warn"
          isLoading={leases.isLoading}
        />
        <MetricCard
          label="Revogadas ou expiradas"
          value={rows.filter((row) => row.status === "revoked" || row.status === "expired").length}
          tone="crit"
          isLoading={leases.isLoading}
        />
      </div>

      <section className="panel p-4">
        <h3 className="text-sm font-semibold">Chaves de assinatura em uso</h3>
        <dl className="mt-2">
          {byKey.map(([keyId, count]) => (
            <StatRow key={keyId} label={keyId} value={`${count} concessões`} />
          ))}
          {byKey.length === 0 && (
            <p className="text-xs text-muted-foreground">Nenhuma concessão emitida neste conjunto de dados.</p>
          )}
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          A rotação de chaves é gerenciada pelo serviço de licenciamento; as instalações confiam no conjunto de chaves publicado.
        </p>
      </section>

      <div className="space-y-3">
        <SectionTitle title="Registro de concessões" description="Ordenado por expiração quando classificado nessa coluna." />
        <DataTable
          data={leases.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={leases.isLoading}
          error={leases.error ?? undefined}
          searchPlaceholder="Buscar concessão, licença ou instalação…"
          searchValue={(row) => `${row.leaseId} ${row.licenseKey} ${row.installationId}`}
          pageSize={15}
        />
      </div>
    </div>
  );
}
