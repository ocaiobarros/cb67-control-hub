import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { NAVIGATION } from "@/config/navigation";
import { AppLink } from "@/components/common/app-link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function SidebarNav({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: (() => void) | undefined;
}) {
  const initiallyOpen = useMemo(
    () =>
      NAVIGATION.filter((group) => group.items?.some((item) => isActive(pathname, item.to))).map(
        (group) => group.label,
      ),
    [pathname],
  );
  const [open, setOpen] = useState<string[]>(initiallyOpen);

  return (
    <ScrollArea className="h-full">
      <nav aria-label="Platform sections" className="space-y-0.5 p-3">
        {NAVIGATION.map((group) => {
          const Icon = group.icon;

          if (group.to) {
            const active = isActive(pathname, group.to);
            return (
              <AppLink
                key={group.label}
                to={group.to}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                {group.label}
              </AppLink>
            );
          }

          const expanded = open.includes(group.label);
          const groupActive = group.items?.some((item) => isActive(pathname, item.to)) ?? false;

          return (
            <div key={group.label}>
              <button
                type="button"
                aria-expanded={expanded}
                onClick={() =>
                  setOpen((prev) =>
                    prev.includes(group.label)
                      ? prev.filter((label) => label !== group.label)
                      : [...prev, group.label],
                  )
                }
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                  groupActive
                    ? "text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{group.label}</span>
                <ChevronRight
                  aria-hidden
                  className={cn("size-3.5 transition-transform", expanded && "rotate-90")}
                />
              </button>

              {expanded && (
                <ul className="mt-0.5 ml-4 space-y-0.5 border-l border-border pl-2">
                  {group.items?.map((item) => {
                    const active = isActive(pathname, item.to);
                    return (
                      <li key={item.to}>
                        <AppLink
                          to={item.to}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block rounded-md px-2.5 py-1.5 text-[0.8125rem] transition-colors",
                            active
                              ? "bg-accent font-medium text-accent-foreground"
                              : "text-muted-foreground hover:bg-muted hover:text-foreground",
                          )}
                        >
                          {item.label}
                        </AppLink>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </ScrollArea>
  );
}
