import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { api } from "@/api/client";
import type { MfaEnrolment } from "@/api/adapter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { formatError } from "@/components/common/error-state";
import { platformMeta } from "@/config/env";

export const Route = createFileRoute("/mfa-enrolment")({
  head: () => ({
    meta: [
      { title: "Cadastro do segundo fator — CB67 Labs Control Center" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: MfaEnrolmentPage,
});

/**
 * First-access enrolment of a second factor.
 *
 * Reached after a password login by an administrator who has none. It is not
 * optional in the flow: an account that can administer the platform with a
 * password alone is the situation the second factor exists to end.
 *
 * The secret, the QR and the recovery codes appear ONLY here, only to a caller
 * that already holds a session, and only once. The recovery codes are stored
 * hashed, so a page that loses them cannot ask for them again — which is why
 * this screen refuses to advance until the operator confirms they are saved.
 */
function MfaEnrolmentPage() {
  const { user, loading, refresh } = useAuth();
  const navigate = useNavigate();

  const [enrolment, setEnrolment] = useState<MfaEnrolment | null>(null);
  const [starting, setStarting] = useState(true);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // No session, no enrolment: the secret must never be handed to an
  // unauthenticated caller.
  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" as never, replace: true });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (loading || !user) return;
    let active = true;
    setStarting(true);
    api
      .beginMfaEnrolment()
      .then((result) => {
        if (active) setEnrolment(result);
      })
      .catch((cause: unknown) => {
        if (active) setError(formatError(cause));
      })
      .finally(() => {
        if (active) setStarting(false);
      });
    return () => {
      active = false;
    };
  }, [loading, user]);

  async function onConfirm(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!code.trim()) {
      setError("Informe o código do aplicativo autenticador.");
      return;
    }
    if (!saved) {
      setError("Confirme que salvou os códigos de recuperação.");
      return;
    }

    setSubmitting(true);
    try {
      await api.confirmMfaEnrolment({ code: code.trim() });
      // The session's capabilities did not change, but the account's did.
      // Re-reading keeps the app from deciding on a stale view of it.
      await refresh();
      await navigate({ to: "/overview" as never, replace: true });
    } catch (cause) {
      setError(formatError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground shadow-depth-2">
            C7
          </span>
          <h1 className="text-lg font-semibold tracking-tight">Cadastre o segundo fator</h1>
          <p className="text-sm text-muted-foreground">
            {platformMeta.productName} exige um segundo fator para contas administrativas. Escaneie
            o código abaixo com Google Authenticator, Microsoft Authenticator ou equivalente.
          </p>
        </div>

        <form
          onSubmit={onConfirm}
          noValidate
          className="liquid-modal edge-light space-y-5 rounded-3xl p-6"
        >
          {starting ? (
            <div className="space-y-3">
              <Skeleton className="mx-auto size-[240px] rounded-xl" />
              <Skeleton className="h-4 w-full" />
            </div>
          ) : enrolment ? (
            <>
              {enrolment.qrDataUri ? (
                <img
                  src={enrolment.qrDataUri}
                  alt="Código QR para cadastrar o segundo fator no aplicativo autenticador"
                  width={240}
                  height={240}
                  className="mx-auto rounded-xl bg-white p-2"
                />
              ) : null}

              <div className="space-y-1.5">
                <Label htmlFor="secret">Ou digite esta chave no aplicativo</Label>
                <Input
                  id="secret"
                  readOnly
                  value={enrolment.secret}
                  className="mono-xs"
                  onFocus={(event) => event.currentTarget.select()}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Códigos de recuperação</Label>
                <p className="text-xs text-muted-foreground">
                  Guarde-os agora, fora deste computador. São exibidos uma única vez e servem para
                  entrar se você perder o telefone.
                </p>
                <ul className="mono-xs grid grid-cols-2 gap-1 rounded-xl border border-border bg-surface-raised p-3">
                  {enrolment.recoveryCodes.map((recovery) => (
                    <li key={recovery}>{recovery}</li>
                  ))}
                </ul>
                <label className="flex items-start gap-2 pt-1 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={saved}
                    onChange={(event) => setSaved(event.target.checked)}
                    className="mt-0.5"
                  />
                  Salvei os códigos de recuperação em local seguro.
                </label>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code">Código do aplicativo</Label>
                <Input
                  id="code"
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  autoFocus
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                  aria-describedby={error ? "enrolment-error" : undefined}
                />
              </div>
            </>
          ) : null}

          {error && (
            <p id="enrolment-error" role="alert" className="text-sm text-crit">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting || starting || !enrolment}>
            {submitting ? "Confirmando…" : "Confirmar e entrar"}
          </Button>
        </form>
      </div>
    </div>
  );
}
