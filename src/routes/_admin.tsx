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
    <AppLink to="/overview" className="flex h-14 items-center gap-2 border-b border-border px-4">
      <span className="grid size-7 place-items-center rounded bg-primary text-xs font-bold text-primary-foreground">
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
      <div className="flex min-h-screen bg-background">
        <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-sidebar lg:flex">
          <BrandMark />
          <div className="min-h-0 flex-1">
            <SidebarNav pathname={pathname} />
          </div>
        </aside>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent side="left" className="w-72 p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <BrandMark />
            <div className="h-[calc(100vh-3.5rem)]">
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
          <main className="min-w-0 flex-1 px-4 py-6 lg:px-6">
            <Outlet />
          </main>
        </div>

        <CommandPalette open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    </ProtectedRoute>
  );
}
