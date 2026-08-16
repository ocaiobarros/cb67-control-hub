import { Fragment } from "react";
import { Menu, Moon, Search, Sun, LogOut, UserRound } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { AppLink } from "@/components/common/app-link";
import { breadcrumbsFor } from "@/config/navigation";
import { useAuth } from "@/features/auth/auth-context";
import { useTheme } from "@/features/theme/theme-context";
import { env } from "@/config/env";

export function Topbar({
  pathname,
  onOpenSidebar,
  onOpenSearch,
}: {
  pathname: string;
  onOpenSidebar: () => void;
  onOpenSearch: () => void;
}) {
  const crumbs = breadcrumbsFor(pathname);
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur lg:px-5">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Open navigation"
        onClick={onOpenSidebar}
      >
        <Menu className="size-4" aria-hidden />
      </Button>

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList>
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {crumb.to && index < crumbs.length - 1 ? (
                  <AppLink to={crumb.to} className="hover:text-foreground">
                    {crumb.label}
                  </AppLink>
                ) : (
                  <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-2">
        <Badge variant="outline" className="mono-xs hidden md:inline-flex">
          {env.environment.toUpperCase()}
        </Badge>
        {env.useMockApi && (
          <Badge
            variant="outline"
            className="mono-xs hidden border-warn/40 text-warn md:inline-flex"
            title="No backend connected — data comes from the local mock adapter"
          >
            MOCK DATA
          </Badge>
        )}

        <Button
          variant="outline"
          size="sm"
          onClick={onOpenSearch}
          className="text-muted-foreground"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Search</span>
          <kbd className="mono-xs ml-1 hidden rounded border border-border px-1 sm:inline">⌘K</kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
          onClick={toggle}
        >
          {theme === "dark" ? (
            <Sun className="size-4" aria-hidden />
          ) : (
            <Moon className="size-4" aria-hidden />
          )}
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Account menu">
              <UserRound className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name ?? "Operator"}</p>
              <p className="mono-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Role: {user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <AppLink to="/settings">Settings</AppLink>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                await router.navigate({ to: "/login" as never });
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
