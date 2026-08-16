import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PublicShell } from "@/components/layout/public-shell";
import { StatusBadge } from "@/components/common/status-badge";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime, formatRelative } from "@/utils/format";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/status")({
  head: () => ({
    meta: [
      { title: "Platform Status — CB67 Labs" },
      {
        name: "description",
        content:
          "Live availability of CB67 Labs platform services, plus the incident timeline with investigation and resolution updates.",
      },
      { property: "og:title", content: "Platform Status — CB67 Labs" },
      {
        property: "og:description",
        content: "Service availability and incident history for the CB67 Labs platform.",
      },
    ],
  }),
  component: StatusPage,
});

function StatusPage() {
  const status = useQuery(q.publicStatus());
  const services = status.data?.services ?? [];
  const incidents = status.data?.incidents ?? [];

  const allHealthy = services.length > 0 && services.every((service) => service.status === "healthy");

  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="space-y-3 border-b border-border pb-6">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Platform Status</h1>
            {services.length > 0 && <StatusBadge status={allHealthy ? "healthy" : "degraded"} />}
          </div>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Availability of public services on <code className="mono-xs">{platformMeta.publicDomain}</code>. This
            page reports observed state; it never exposes customer data or internal identifiers.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Services</h2>
          {status.isLoading ? (
            <div className="space-y-2">
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-16 w-full" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <EmptyState message="No service state published" />
          ) : (
            <ul className="space-y-2">
              {services.map((service) => (
                <li key={service.id} className="panel flex items-start justify-between gap-4 p-4">
                  <div className="min-w-0">
                    <p className="text-sm font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">{service.description}</p>
                  </div>
                  <StatusBadge status={service.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-semibold tracking-wide uppercase">Incidents</h2>
          {status.isLoading ? (
            <Skeleton className="h-24 w-full" />
          ) : incidents.length === 0 ? (
            <EmptyState message="No incidents reported" hint="The platform has no recorded incidents in the published window." />
          ) : (
            <div className="space-y-4">
              {incidents.map((incident) => (
                <article key={incident.id} className="panel space-y-3 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold">{incident.title}</h3>
                    <StatusBadge status={incident.state} />
                  </div>
                  <p className="mono-xs text-muted-foreground">
                    Started {formatDateTime(incident.startedAt)} · {formatRelative(incident.startedAt)}
                  </p>
                  <ol className="space-y-3 border-l border-border pl-4">
                    {incident.updates.map((update) => (
                      <li key={`${incident.id}-${update.at}`} className="space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="mono-xs text-muted-foreground">{formatDateTime(update.at)}</span>
                          <StatusBadge status={update.state} />
                        </div>
                        <p className="text-sm">{update.message}</p>
                      </li>
                    ))}
                  </ol>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </PublicShell>
  );
}
