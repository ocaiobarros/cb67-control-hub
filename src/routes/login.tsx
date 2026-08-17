import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatError } from "@/components/common/error-state";
import { MISSING_PASSWORD, MISSING_USERNAME, submitLogin } from "@/features/auth/login-validation";
import { env, platformMeta } from "@/config/env";
import { api, isMockMode } from "@/api/client";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Login do operador — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Autentique-se como operador da plataforma para acessar o CB67 Labs Control Center. O acesso é restrito à rede de gestão.",
      },
      { property: "og:title", content: "Login do operador — CB67 Labs Control Center" },
      {
        property: "og:description",
        content: "Acesso restrito de operador ao CB67 Labs Control Center.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

/**
 * Where an authenticated operator belongs.
 *
 * An administrator with no second factor is sent to enrol one rather than to
 * the console. An account that can administer the platform on a password alone
 * is exactly the situation the factor exists to end, so arriving at /overview
 * without one would make the factor optional in practice.
 *
 * A failure to read the status sends them to the console rather than trapping
 * them on an enrolment screen that may itself be failing: the API is already
 * behind authentication, and being unable to check is not evidence of absence.
 */
async function destinationAfterLogin(): Promise<never> {
  try {
    const status = await api.getMfaStatus();
    return (status.enabled ? "/overview" : "/mfa-enrolment") as never;
  } catch {
    return "/overview" as never;
  }
}

function LoginPage() {
  const { user, loading, login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // When true the password step succeeded and the server is holding a
  // challenge. The password is cleared at that point: it has been spent, and
  // keeping it in component state serves no purpose.
  const [awaitingCode, setAwaitingCode] = useState(false);
  const [code, setCode] = useState("");

  useEffect(() => {
    if (loading || !user) return;
    void destinationAfterLogin().then((to) => navigate({ to, replace: true }));
  }, [loading, user, navigate]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    setSubmitting(true);
    try {
      if (awaitingCode) {
        await verifyMfa({ code });
      } else {
        // submitLogin applies the required-field rules and only then reaches
        // the network, so a blank field never becomes a 401 reported as a wrong
        // password.
        const outcome = await submitLogin({ username, password }, login, formatError);
        if (!outcome.ok) {
          setError(outcome.message);
          return;
        }
        if (outcome.result) {
          setPassword("");
          setCode("");
          setAwaitingCode(true);
          return;
        }
      }
      await navigate({ to: await destinationAfterLogin(), replace: true });
    } catch (cause) {
      setError(formatError(cause));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold shadow-depth-2 text-primary-foreground">
            C7
          </span>
          <h1 className="text-lg font-semibold tracking-tight">{platformMeta.productName}</h1>
          <p className="text-sm text-muted-foreground">
            Acesso somente para operadores. Autenticação e autorização são aplicadas pela
            plataforma.
          </p>
        </div>

        <form
          onSubmit={onSubmit}
          noValidate
          className="liquid-modal edge-light space-y-4 rounded-3xl p-6"
        >
          {awaitingCode ? (
            <div className="space-y-1.5">
              <Label htmlFor="code">Código de verificação</Label>
              <Input
                id="code"
                name="code"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                Informe o código do aplicativo autenticador, ou um código de recuperação.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="username">Operador</Label>
                <Input
                  id="username"
                  name="username"
                  autoComplete="username"
                  required
                  aria-invalid={error === MISSING_USERNAME}
                  aria-describedby={error ? "login-error" : undefined}
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={error === MISSING_PASSWORD}
                  aria-describedby={error ? "login-error" : undefined}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                />
              </div>
            </>
          )}

          {error && (
            <p id="login-error" role="alert" className="text-sm text-crit">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Verificando…" : awaitingCode ? "Verificar" : "Entrar"}
          </Button>

          {awaitingCode && (
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              disabled={submitting}
              onClick={() => {
                // Returning to the credentials step abandons the challenge; the
                // server expires it on its own and it grants nothing meanwhile.
                setAwaitingCode(false);
                setCode("");
                setError(null);
              }}
            >
              Voltar
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Ambiente: <code className="mono-xs">{env.environment}</code>
            {isMockMode ? " · dados simulados; qualquer credencial é aceita" : null}
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Acessível somente a partir da rede de gestão em{" "}
          <code className="mono-xs">{platformMeta.adminDomain}</code>.
        </p>
      </div>
    </div>
  );
}
