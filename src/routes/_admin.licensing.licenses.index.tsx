import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Permitted } from "@/features/auth/guards";
import { useAdminAction } from "@/hooks/use-admin-action";
import { FormDialog } from "@/components/common/form-dialog";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PageHeader, SectionTitle } from "@/components/common/page-header";
import { DataTable, type Column } from "@/components/common/data-table";
import { MetricCard } from "@/components/common/metric-card";
import { StatusBadge } from "@/components/common/status-badge";
import { daysUntil, formatDate, formatNumber, formatRelativeOrNull } from "@/utils/format";
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
  const customers = useQuery(q.customers());
  const plans = useQuery(q.plans());
  const action = useAdminAction();
  const [creating, setCreating] = useState(false);
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
          <span className="mono-xs">
            {formatDate(row.startsAt)} → {formatDate(row.expiresAt)}
          </span>
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
          className={row.installations >= row.maxInstallations ? "tabular text-warn" : "tabular"}
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
        <span className="mono-xs text-muted-foreground">
          {formatRelativeOrNull(row.lastValidationAt)}
        </span>
      ),
      sortValue: (row) => row.lastValidationAt ?? undefined,
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
        actions={
          <Permitted permission="licensing.write">
            <Button size="sm" onClick={() => setCreating(true)}>
              <Plus className="size-4" aria-hidden />
              Emitir licença
            </Button>
          </Permitted>
        }
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
        <SectionTitle
          title="Licenças emitidas"
          description="Clique em uma licença para abrir o registro."
        />
        <DataTable
          data={licenses.data}
          columns={columns}
          rowKey={(row) => row.id}
          isLoading={licenses.isLoading}
          error={licenses.error ?? undefined}
          searchPlaceholder="Pesquisar chave, cliente ou produto…"
          searchValue={(row) => `${row.key} ${row.customerName} ${row.productName} ${row.plan}`}
          pageSize={15}
          onRowClick={(row) => {
            void navigate({ to: `/licensing/licenses/${row.id}` as never });
          }}
        />
      </div>

      <FormDialog
        open={creating}
        onOpenChange={setCreating}
        title="Emitir licença"
        description="A chave é gerada pelo servidor. A licença nasce ativa, válida a partir de agora."
        submitLabel="Emitir licença"
        fields={[
          {
            kind: "select",
            name: "customerId",
            label: "Cliente",
            required: true,
            options: (customers.data ?? []).map((c) => ({ value: c.id, label: c.name })),
            emptyHint: "Nenhum cliente cadastrado. Crie um cliente antes de emitir uma licença.",
          },
          {
            // The product is derived from the plan rather than chosen
            // separately: a plan belongs to exactly one product, and offering
            // both would let the operator pick a pair the database refuses.
            kind: "select",
            name: "planId",
            label: "Plano",
            required: true,
            hint: "O produto é determinado pelo plano.",
            options: (plans.data ?? []).map((p) => ({
              value: p.id,
              label: `${p.productName} · ${p.name} — ${p.maxInstallations} instalação(ões)`,
            })),
            emptyHint: "Nenhum plano cadastrado. Crie um plano antes de emitir uma licença.",
          },
          {
            kind: "number",
            name: "durationDays",
            label: "Validade (dias)",
            min: 1,
            max: 3650,
            defaultValue: 365,
          },
        ]}
        onSubmit={async (values) => {
          const plan = (plans.data ?? []).find((p) => p.id === values["planId"]);
          if (!plan) throw new Error("Selecione um plano.");
          const created = await action.mutateAsync({
            action: "license.create",
            resourceId: "",
            payload: { ...values, productId: plan.productId },
          });
          // Open what was just issued, so the operator sees the generated key
          // instead of hunting for it in the list.
          if (created.resourceId) {
            void navigate({ to: `/licensing/licenses/${created.resourceId}` as never });
          }
        }}
      />
    </div>
  );
}
