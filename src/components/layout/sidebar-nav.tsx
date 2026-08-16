import { useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { NAVIGATION } from "@/config/navigation";
import { AppLink } from "@/components/common/app-link";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

function isActive(pathname: string, to: string) {
  return pathname === to || pathname.startsWith(`${to}/`);
}

/**
 * CB67 Liquid Interface — navigation.
 * The active item is a liquid pill: it carries the accent tint, an optical rim
 * and a luminous leading marker so hierarchy reads at a glance (CONTINUITY).
 */
const ITEM_BASE =
  "relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-[background-color,color,box-shadow] duration-200 ease-standard";
const ITEM_IDLE = "text-muted-foreground hover:bg-accent/70 hover:text-foreground";
const ITEM_ACTIVE =
  "bg-accent text-accent-foreground shadow-depth-1 before:absolute before:left-0 before:top-1/2 before:h-4 before:w-0.5 before:-translate-y-1/2 before:rounded-full before:bg-primary";

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
                className={cn(ITEM_BASE, active ? ITEM_ACTIVE : ITEM_IDLE)}
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
                  ITEM_BASE,
                  "w-full cursor-pointer",
                  groupActive ? "text-foreground" : ITEM_IDLE,
                )}
              >
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1 text-left">{group.label}</span>
                {groupActive && !expanded && (
                  <span aria-hidden className="size-1.5 rounded-full bg-primary" />
                )}
                <ChevronRight
                  aria-hidden
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform duration-300 ease-standard",
                    expanded && "rotate-90",
                  )}
                />
              </button>

              {expanded && (
                <ul className="mt-0.5 ml-[1.4rem] space-y-0.5 border-l border-border pl-2">
                  {group.items?.map((item) => {
                    const active = isActive(pathname, item.to);
                    return (
                      <li key={item.to} className="content-enter">
                        <AppLink
                          to={item.to}
                          onClick={onNavigate}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-2.5 py-1.5 text-[0.8125rem] transition-colors duration-200 ease-standard",
                            active
                              ? "bg-accent font-medium text-accent-foreground shadow-depth-1"
                              : "text-muted-foreground hover:bg-accent/70 hover:text-foreground",
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
