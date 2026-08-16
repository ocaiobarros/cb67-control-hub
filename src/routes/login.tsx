import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { describeError } from "@/components/common/error-state";
import { env, platformMeta } from "@/config/env";
import { isMockMode } from "@/api/client";

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
      { property: "og:description", content: "Acesso restrito de operador ao CB67 Labs Control Center." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { user, loading, login } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/overview" as never, replace: true });
  }, [loading, user, navigate]);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login({ username, password });
      await navigate({ to: "/overview" as never, replace: true });
    } catch (cause) {
      const { title, detail } = describeError(cause);
      setError(detail ? `${title}: ${detail}` : title);
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
            Acesso somente para operadores. Autenticação e autorização são aplicadas pela plataforma.
          </p>
        </div>

        <form onSubmit={onSubmit} className="liquid-modal edge-light space-y-4 rounded-3xl p-6">
          <div className="space-y-1.5">
            <Label htmlFor="username">Operador</Label>
            <Input
              id="username"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-crit">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Entrando…" : "Entrar"}
          </Button>

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
