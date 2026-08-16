import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { Topbar } from "@/components/layout/topbar";
import { CommandPalette } from "@/components/layout/command-palette";
import { AppLink } from "@/components/common/app-link";
import { ProtectedRoute } from "@/features/auth/guards";

export const Route = createFileRoute("/_admin")({
  component: AdminLayout,
});

function BrandMark() {
  return (
    <AppLink
      to="/overview"
      className="group flex h-14 items-center gap-2.5 border-b border-border px-4"
    >
      <span className="relative grid size-7 place-items-center overflow-hidden rounded-lg bg-primary text-[0.6875rem] font-bold text-primary-foreground shadow-depth-2 before:absolute before:inset-x-0 before:top-0 before:h-1/2 before:bg-gradient-to-b before:from-white/25 before:to-transparent">
        C7
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-semibold tracking-tight">CB67 LABS</span>
        <span className="mono-xs block text-muted-foreground">CONTROL CENTER</span>
      </span>
    </AppLink>
  );
}

function AdminLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <ProtectedRoute>
      {/* LEVEL 0 canvas: the atmospheric gradient lives on body::before. */}
      <div className="flex min-h-dvh">
        {/* LEVEL 1 navigation: liquid glass chrome over the canvas. */}
        <aside className="liquid-nav hidden w-64 shrink-0 flex-col border-r border-border lg:flex">
          <BrandMark />
          <div className="min-h-0 flex-1">
            <SidebarNav pathname={pathname} />
          </div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 rounded-r-3xl p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <BrandMark />
            <div className="h-[calc(100dvh-3.5rem)]">
              <SidebarNav pathname={pathname} onNavigate={() => setMobileOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>

        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar
            pathname={pathname}
            onOpenSidebar={() => setMobileOpen(true)}
            onOpenSearch={() => setSearchOpen(true)}
          />
          {/* LEVEL 2 content plane. Keyed reveal gives route changes continuity. */}
          <main key={pathname} className="content-enter min-w-0 flex-1 px-4 py-6 lg:px-7 lg:py-7">
            <Outlet />
          </main>
        </div>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ProtectedRoute>
  );
}
