import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { NAV_INDEX } from "@/config/navigation";

export function CommandPalette({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        onOpenChange(!open);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  const groups = Array.from(new Set(NAV_INDEX.map((entry) => entry.group ?? "Platform")));

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <CommandInput placeholder="Search sections, resources, actions…" />
      <CommandList>
        <CommandEmpty>No matching section.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {NAV_INDEX.filter((entry) => (entry.group ?? "Platform") === group).map((entry) => (
              <CommandItem
                key={entry.to}
                value={`${group} ${entry.label} ${entry.to}`}
                onSelect={() => {
                  onOpenChange(false);
                  void navigate({ to: entry.to as never });
                }}
              >
                <span>{entry.label}</span>
                <span className="mono-xs ml-auto text-muted-foreground">{entry.to}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ))}
      </CommandList>
    </CommandDialog>
  );
}
