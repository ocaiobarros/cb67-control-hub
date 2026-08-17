import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { FormDialog } from "@/components/common/form-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { formatNumber } from "@/utils/format";
import type { LicensePlan } from "@/types";

export const Route = createFileRoute("/_admin/licensing/plans")({
  head: () => ({
    meta: [
      { title: "Planos de Licença — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Planos comerciais com tetos de instalação, recursos incluídos e o número de licenças vendidas em cada camada.",
      },
      { property: "og:title", content: "Planos de Licença — CB67 Labs Control Center" },
      { property: "og:description", content: "Tetos, recursos incluídos e adoção por plano." },
    ],
  }),
  component: PlansPage,
});

function PlansPage() {
  const plans = useQuery(q.plans());
  const products = useQuery(q.products());
  const features = useQuery(q.features());
  const action = useAdminAction();
  const [creating, setCreating] = useState(false);
  const rows = plans.data ?? [];

  const columns: Column<LicensePlan>[] = [
    {
      id: "product",
      header: "Produto",
      // Two products may both have a "Starter"; without this the list cannot
      // be read.
      cell: (row) => <span className="text-sm">{row.productName}</span>,
      sortValue: (row) => row.productName,
    },
    {
      id: "name",
      header: "Plano",
      cell: (row) => (
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">{row.name}</p>
          <code className="mono-xs text-muted-foreground">{row.code}</code>
        </div>
      ),
      sortValue: (row) => row.name,
    },
    {
      id: "max",
      header: "Teto de instalação",
      cell: (row) => <span className="tabular">{formatNumber(row.maxInstallations)}</span>,
      sortValue: (row) => row.maxInstallations,
      align: "right",
    },
    {
      id: "features",
      header: "Recursos incluídos",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.features.map((feature) => (
            <code key={feature} className="mono-xs rounded border border-border px-1 py-0.5">
              {feature}
            </code>
          ))}
        </div>
      ),
    },
    {
      id: "active",
      header: "Licenças ativas",
      cell: (row) => <span className="tabular">{formatNumber(row.activeLicenses)}</span>,
      sortValue: (row) => row.activeLicenses,
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
        title="Planos de Licença"
        description="Os planos expressam o que um cliente pode executar: quantas instalações e quais recursos são concedidos. Preços estão propositalmente fora do escopo desta interface."
        actions={
          <Permitted permission="licensing.write">
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Novo plano
            </Button>
          </Permitted>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Planos" value={rows.length} isLoading={plans.isLoading} />
        <MetricCard
          label="Ativos"
          value={rows.filter((row) => row.status === "active").length}
          tone="ok"
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Licenças no plano"
          value={formatNumber(rows.reduce((sum, row) => sum + row.activeLicenses, 0))}
          isLoading={plans.isLoading}
        />
        <MetricCard
          label="Recursos distintos"
          value={new Set(rows.flatMap((row) => row.features)).size}
          isLoading={plans.isLoading}
        />
      </div>

      <div className="space-y-3">
        <SectionTitle
          title="Catálogo de planos"
          description="Os pacotes de recursos são resolvidos na emissão da concessão."
        />
        <DataTable
          data={plans.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={plans.isLoading}
          error={plans.error ?? undefined}
          searchPlaceholder="Pesquisar plano ou código…"
          searchValue={(row) => `${row.name} ${row.code} ${row.productName}`}
          pageSize={15}
        />
      </div>

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Novo plano"
        description="Um plano pertence a um produto e define o teto de instalações e os recursos concedidos."
        submitLabel="Criar plano"
        fields={[
          {
            kind: "select",
            name: "productId",
            label: "Produto",
            required: true,
            options: (products.data ?? []).map((p) => ({ value: p.id, label: p.name })),
            emptyHint: "Nenhum produto cadastrado. Crie um produto antes de criar um plano.",
          },
          {
            kind: "text",
            name: "code",
            label: "Código",
            placeholder: "professional",
            hint: "Minúsculas, números e hífen. Único dentro do produto.",
            required: true,
            maxLength: 40,
          },
          {
            kind: "text",
            name: "name",
            label: "Nome",
            placeholder: "Professional",
            required: true,
            maxLength: 120,
          },
          {
            kind: "number",
            name: "maxInstallations",
            label: "Limite de instalações",
            min: 1,
            max: 100000,
            defaultValue: 1,
            hint: "Instalações revogadas ou expiradas não ocupam vaga.",
          },
          {
            kind: "multiselect",
            name: "featureIds",
            label: "Recursos concedidos",
            options: (features.data ?? []).map((f) => ({
              value: f.id,
              label: `${f.name} (${f.code})`,
            })),
            emptyHint:
              "Nenhum recurso cadastrado. Um plano sem recursos é válido, mas não concede nada.",
          },
        ]}
        onSubmit={async (values) => {
          await action.mutateAsync({ action: "plan.create", resourceId: "", payload: values });
        }}
      />
    </div>
  );
}
