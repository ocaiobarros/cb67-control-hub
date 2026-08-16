import type { ReactNode } from "react";
import { AppLink } from "@/components/common/app-link";
import { Button } from "@/components/ui/button";
import { platformMeta } from "@/config/env";

const NAV = [
  { label: "Plataforma", to: "/" },
  { label: "Docs", to: "/docs" },
  { label: "Status", to: "/status" },
  { label: "Changelog", to: "/changelog" },
];

/** Public plane chrome: no authenticated data, no operator controls. */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="liquid-nav sticky top-0 z-30 border-b border-border">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">
          <AppLink to="/" className="flex items-center gap-2">
            <span className="grid size-7 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
              C7
            </span>
            <span className="text-sm font-semibold tracking-tight">{platformMeta.name}</span>
          </AppLink>
          <nav aria-label="Navegação pública" className="flex items-center gap-1">
            {NAV.map((item) => (
              <AppLink
                key={item.to}
                to={item.to}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                activeProps={{ className: "bg-accent text-accent-foreground" }}
              >
                {item.label}
              </AppLink>
            ))}
            <Button asChild size="sm" className="ml-2">
              <AppLink to="/login">Control Center</AppLink>
            </Button>
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-10">{children}</main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 text-xs text-muted-foreground">
          <p>
            {platformMeta.name} — plataforma de API on-premises. Operada a partir de Debian 13 em Proxmox.
          </p>
          <p className="mono-xs">{platformMeta.publicDomain}</p>
        </div>
      </footer>
    </div>
  );
}
