import { Fragment, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";

/**
 * CB67 Liquid Interface — adaptive chrome.
 * The topbar is a liquid glass layer that gains blur, tint and depth once
 * content scrolls beneath it, so the material reacts to what is behind it.
 */
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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 items-center gap-2 px-3 transition-[background-color,box-shadow,border-color] duration-300 ease-standard lg:px-5",
        scrolled ? "liquid-nav border-b border-border" : "border-b border-transparent",
      )}
    >
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        aria-label="Abrir navegação"
        onClick={onOpenSidebar}
      >
        <Menu className="size-4" aria-hidden />
      </Button>

      <Breadcrumb className="hidden min-w-0 sm:block">
        <BreadcrumbList className="text-[0.8125rem]">
          {crumbs.map((crumb, index) => (
            <Fragment key={`${crumb.label}-${index}`}>
              <BreadcrumbItem>
                {crumb.to && index < crumbs.length - 1 ? (
                  <AppLink to={crumb.to} className="transition-colors hover:text-foreground">
                    {crumb.label}
                  </AppLink>
                ) : (
                  <BreadcrumbPage className="truncate font-medium">{crumb.label}</BreadcrumbPage>
                )}
              </BreadcrumbItem>
              {index < crumbs.length - 1 && <BreadcrumbSeparator />}
            </Fragment>
          ))}
        </BreadcrumbList>
      </Breadcrumb>

      <div className="ml-auto flex items-center gap-1.5">
        <Badge variant="outline" className="mono-xs hidden md:inline-flex">
          {env.environment.toUpperCase()}
        </Badge>
        {env.useMockApi && (
          <Badge
            variant="outline"
            className="mono-xs hidden border-warn/40 bg-warn/10 text-warn md:inline-flex"
            title="Nenhum backend conectado — os dados vêm do adaptador simulado local"
          >
            MOCK DATA
          </Badge>
        )}

        <Button
          variant="glass"
          size="sm"
          onClick={onOpenSearch}
          className="ml-1 gap-2 text-muted-foreground"
        >
          <Search className="size-3.5" aria-hidden />
          <span className="hidden sm:inline">Pesquisar</span>
          <kbd className="mono-xs ml-1 hidden rounded border border-border px-1 sm:inline">⌘K</kbd>
        </Button>

        <Button
          variant="ghost"
          size="icon"
          aria-label={theme === "dark" ? "Alternar para tema claro" : "Alternar para tema escuro"}
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
            <Button variant="ghost" size="icon" aria-label="Menu da conta">
              <UserRound className="size-4" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel>
              <p className="text-sm font-medium">{user?.name ?? "Operador"}</p>
              <p className="mono-xs text-muted-foreground">{user?.email}</p>
              <p className="mt-1 text-xs text-muted-foreground">Função: {user?.role}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <AppLink to="/settings">Configurações</AppLink>
            </DropdownMenuItem>
            <DropdownMenuItem
              onSelect={async () => {
                await logout();
                await router.navigate({ to: "/login" as never });
              }}
            >
              <LogOut className="size-4" aria-hidden />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
