import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { q } from "@/api/queries";
import { PublicShell } from "@/components/layout/public-shell";
import { EmptyState } from "@/components/common/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/utils/format";

export const Route = createFileRoute("/changelog")({
  head: () => ({
    meta: [
      { title: "Changelog — CB67 Labs Platform" },
      {
        name: "description",
        content:
          "Release history for the CB67 Labs API platform: API versions, licensing changes and platform improvements per release.",
      },
      { property: "og:title", content: "Changelog — CB67 Labs Platform" },
      { property: "og:description", content: "Release history for the CB67 Labs API platform." },
    ],
  }),
  component: ChangelogPage,
});

function ChangelogPage() {
  const changelog = useQuery(q.changelog());
  const entries = changelog.data ?? [];

  return (
    <PublicShell>
      <div className="space-y-10">
        <header className="space-y-3 border-b border-border pb-6">
          <h1 className="text-2xl font-semibold tracking-tight">Changelog</h1>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Platform releases follow semantic versioning. Breaking API changes ship as a new API version and
            the previous version stays available for its announced deprecation window.
          </p>
        </header>

        {changelog.isLoading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((key) => (
              <Skeleton key={key} className="h-28 w-full" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <EmptyState message="No releases published" />
        ) : (
          <ol className="space-y-6">
            {entries.map((entry) => (
              <li key={entry.version} className="panel space-y-3 p-5">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <h2 className="text-sm font-semibold">
                    <code className="mono-xs text-foreground">{entry.version}</code>
                  </h2>
                  <span className="mono-xs text-muted-foreground">{formatDate(entry.date)}</span>
                </div>
                <ul className="space-y-1.5">
                  {entry.changes.map((change) => (
                    <li key={change} className="flex gap-2 text-sm text-muted-foreground">
                      <span aria-hidden className="text-primary">
                        —
                      </span>
                      <span>{change}</span>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </PublicShell>
  );
}
