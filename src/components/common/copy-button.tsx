import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** Only for non-sensitive technical identifiers. Never render for secrets. */
export function CopyButton({ value, label }: { value: string; label?: string | undefined }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 shrink-0"
      aria-label={label ? `Copiar ${label}` : "Copiar valor"}
      onClick={async (event) => {
        event.stopPropagation();
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1400);
        } catch {
          setCopied(false);
        }
      }}
    >
      {copied ? (
        <Check className="size-3.5 text-ok" aria-hidden />
      ) : (
        <Copy className="size-3.5" aria-hidden />
      )}
    </Button>
  );
}

export function IdentifierCell({
  value,
  label,
  className,
}: {
  value: string;
  label?: string | undefined;
  className?: string | undefined;
}) {
  return (
    <span className={cn("inline-flex items-center gap-1", className)}>
      <code className="mono-xs text-foreground">{value}</code>
      <CopyButton value={value} label={label} />
    </span>
  );
}

/** Secrets are never retrievable in this UI; only a masked placeholder is shown. */
export function MaskedSecret() {
  return (
    <span className="mono-xs text-muted-foreground" title="Valores de segredo não podem ser recuperados">
      ••••••••••••••••
    </span>
  );
}
