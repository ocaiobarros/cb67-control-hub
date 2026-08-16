import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions,
  meta,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
  meta?: ReactNode | undefined;
}) {
  return (
    <header className="content-enter flex flex-wrap items-start justify-between gap-4 pb-1">
      <div className="min-w-0 space-y-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-page-title min-w-0 truncate">{title}</h1>
          {meta}
        </div>
        {description && (
          <p className="max-w-3xl text-sm leading-relaxed text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string | undefined;
  actions?: ReactNode | undefined;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <h2 className="text-section-title text-foreground/80">{title}</h2>
        {description && <p className="mt-1 text-caption">{description}</p>}
      </div>
      {actions}
    </div>
  );
}
