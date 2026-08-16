import { useState, type ReactNode } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatRow } from "./metric-card";
import { cn } from "@/lib/utils";

/**
 * Destructive confirmation. UX only: the backend must re-verify authorization
 * and record the operation in the audit log.
 */
export function ConfirmActionDialog({
  open,
  onOpenChange,
  title,
  warning,
  details,
  confirmLabel,
  requireTypedValue,
  destructive = true,
  environmentNotice,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  warning: string;
  details?: { label: string; value: ReactNode }[] | undefined;
  confirmLabel: string;
  requireTypedValue?: string | undefined;
  destructive?: boolean | undefined;
  environmentNotice?: string | undefined;
  onConfirm: () => Promise<void> | void;
}) {
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const blocked = Boolean(requireTypedValue) && typed !== requireTypedValue;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!busy) {
          setTyped("");
          onOpenChange(next);
        }
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {destructive && <ShieldAlert className="size-4 text-crit" aria-hidden />}
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription>{warning}</AlertDialogDescription>
        </AlertDialogHeader>

        {details && details.length > 0 && (
          <dl className="rounded-md border border-border bg-muted/40 px-3 py-1">
            {details.map((detail) => (
              <StatRow key={detail.label} label={detail.label} value={detail.value} />
            ))}
          </dl>
        )}

        {environmentNotice && (
          <p className="rounded-md border border-crit/30 bg-crit/10 px-3 py-2 text-xs font-medium text-crit">
            {environmentNotice}
          </p>
        )}

        {requireTypedValue && (
          <div className="space-y-1.5">
            <Label htmlFor="confirm-typed">
              Digite <code className="mono-xs">{requireTypedValue}</code> para confirmar
            </Label>
            <Input
              id="confirm-typed"
              value={typed}
              autoComplete="off"
              onChange={(e) => setTyped(e.target.value)}
            />
          </div>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            disabled={blocked || busy}
            className={cn(destructive && "bg-destructive text-destructive-foreground")}
            onClick={async (event) => {
              event.preventDefault();
              setBusy(true);
              try {
                await onConfirm();
                setTyped("");
                onOpenChange(false);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
