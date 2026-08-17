import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { describeError } from "./error-state";

/**
 * A form in a dialog, for the administrative records an operator creates.
 *
 * Every write in this application funnels through `performAction`, and until
 * now the only dialog was `ConfirmActionDialog` — enough to confirm a
 * destructive act, useless for entering one. Licensing had nine read-only
 * screens and no way to put a single row behind them, so the Control Center
 * could display a licence estate it gave the operator no means to create.
 *
 * Fields are declared rather than written out per screen, so five creation
 * forms share one set of behaviours: required fields disable the submit, the
 * dialog cannot be dismissed mid-flight, and the backend's refusal is shown
 * in the dialog rather than only as a toast that disappears while the operator
 * is still reading the form they must correct.
 */

export type FormFieldSpec =
  | {
      kind: "text";
      name: string;
      label: string;
      placeholder?: string;
      hint?: string;
      required?: boolean;
      maxLength?: number;
    }
  | {
      kind: "textarea";
      name: string;
      label: string;
      placeholder?: string;
      hint?: string;
      maxLength?: number;
    }
  | {
      kind: "number";
      name: string;
      label: string;
      min: number;
      max: number;
      defaultValue: number;
      hint?: string;
    }
  | {
      kind: "select";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      hint?: string;
      required?: boolean;
      emptyHint?: string;
    }
  | {
      kind: "multiselect";
      name: string;
      label: string;
      options: { value: string; label: string }[];
      hint?: string;
      emptyHint?: string;
    };

export type FormValues = Record<string, string | number | string[]>;

function initialValues(fields: FormFieldSpec[]): FormValues {
  const out: FormValues = {};
  for (const field of fields) {
    if (field.kind === "number") out[field.name] = field.defaultValue;
    else if (field.kind === "multiselect") out[field.name] = [];
    else out[field.name] = "";
  }
  return out;
}

/** Whether every required field carries a value. */
function complete(fields: FormFieldSpec[], values: FormValues): boolean {
  return fields.every((field) => {
    if (field.kind === "number") return typeof values[field.name] === "number";
    if (field.kind === "multiselect" || field.kind === "textarea") return true;
    if (!field.required) return true;
    return String(values[field.name] ?? "").trim() !== "";
  });
}

export function FormDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  submitLabel,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  fields: FormFieldSpec[];
  submitLabel: string;
  /** Rejects with a message the operator can act on; the dialog stays open. */
  onSubmit: (values: FormValues) => Promise<void>;
}) {
  const [values, setValues] = useState<FormValues>(() => initialValues(fields));
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);

  // Reopening must not show what was typed last time, nor the error that was
  // corrected by closing.
  useEffect(() => {
    if (open) {
      setValues(initialValues(fields));
      setFailure(null);
    }
    // fields is rebuilt on each render by callers; keying on `open` is what is
    // actually meant here.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const set = (name: string, value: string | number | string[]) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        // Closing mid-request would leave the operator unsure whether the
        // record was created.
        if (!busy) onOpenChange(next);
      }}
    >
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-1.5">
              <Label htmlFor={`field-${field.name}`}>
                {field.label}
                {"required" in field && field.required && (
                  <span className="text-crit" aria-hidden>
                    {" *"}
                  </span>
                )}
              </Label>

              {field.kind === "text" && (
                <Input
                  id={`field-${field.name}`}
                  value={String(values[field.name] ?? "")}
                  autoComplete="off"
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}

              {field.kind === "textarea" && (
                <Textarea
                  id={`field-${field.name}`}
                  value={String(values[field.name] ?? "")}
                  maxLength={field.maxLength}
                  placeholder={field.placeholder}
                  onChange={(e) => set(field.name, e.target.value)}
                />
              )}

              {field.kind === "number" && (
                <Input
                  id={`field-${field.name}`}
                  type="number"
                  inputMode="numeric"
                  min={field.min}
                  max={field.max}
                  value={String(values[field.name] ?? field.defaultValue)}
                  onChange={(e) => {
                    // An empty box is not zero. Keeping the last valid number
                    // avoids submitting 0 for a field whose minimum is 1.
                    const parsed = Number.parseInt(e.target.value, 10);
                    if (Number.isFinite(parsed)) set(field.name, parsed);
                  }}
                />
              )}

              {field.kind === "select" &&
                (field.options.length === 0 ? (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {field.emptyHint ?? "Nada disponível para selecionar."}
                  </p>
                ) : (
                  <Select
                    value={String(values[field.name] ?? "")}
                    onValueChange={(next) => set(field.name, next)}
                  >
                    <SelectTrigger id={`field-${field.name}`}>
                      <SelectValue placeholder="Selecione…" />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ))}

              {field.kind === "multiselect" &&
                (field.options.length === 0 ? (
                  <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                    {field.emptyHint ?? "Nada disponível para selecionar."}
                  </p>
                ) : (
                  <div className="space-y-2 rounded-md border border-border p-3">
                    {field.options.map((option) => {
                      const selected = (values[field.name] as string[]) ?? [];
                      const checked = selected.includes(option.value);
                      return (
                        <label
                          key={option.value}
                          className="flex cursor-pointer items-center gap-2 text-sm"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(next) =>
                              set(
                                field.name,
                                next
                                  ? [...selected, option.value]
                                  : selected.filter((v) => v !== option.value),
                              )
                            }
                          />
                          {option.label}
                        </label>
                      );
                    })}
                  </div>
                ))}

              {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
            </div>
          ))}

          {failure && (
            <p
              role="alert"
              data-testid="form-dialog-error"
              className="rounded-md border border-crit/30 bg-crit/10 px-3 py-2 text-xs font-medium text-crit"
            >
              {failure}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            disabled={busy || !complete(fields, values)}
            onClick={async () => {
              setBusy(true);
              setFailure(null);
              try {
                await onSubmit(values);
                onOpenChange(false);
              } catch (error) {
                // Shown here, beside the fields it refers to. A toast alone
                // vanishes while the operator is still reading the form.
                // describeError, not error.message: an HttpError's message is
                // "Request failed with status 422", while the gateway's own
                // sentence — which plan belongs to another product, which code
                // is taken — is in the body and is the only useful half.
                setFailure(describeError(error).detail);
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy && <Loader2 className="size-4 animate-spin" aria-hidden />}
            {submitLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
