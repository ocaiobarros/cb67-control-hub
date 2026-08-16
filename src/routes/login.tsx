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
      { title: "Operator Sign In — CB67 Labs Control Center" },
      {
        name: "description",
        content:
          "Authenticate as a platform operator to access the CB67 Labs Control Center. Access is restricted to the management network.",
      },
      { property: "og:title", content: "Operator Sign In — CB67 Labs Control Center" },
      { property: "og:description", content: "Restricted operator access to the CB67 Labs Control Center." },
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
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <span className="mx-auto grid size-9 place-items-center rounded bg-primary text-sm font-bold text-primary-foreground">
            C7
          </span>
          <h1 className="text-lg font-semibold tracking-tight">{platformMeta.productName}</h1>
          <p className="text-sm text-muted-foreground">
            Operator access only. Authentication and authorization are enforced by the platform.
          </p>
        </div>

        <form onSubmit={onSubmit} className="panel space-y-4 p-5">
          <div className="space-y-1.5">
            <Label htmlFor="username">Operator</Label>
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
            <Label htmlFor="password">Password</Label>
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
            {submitting ? "Signing in…" : "Sign in"}
          </Button>

          <p className="text-xs text-muted-foreground">
            Environment: <code className="mono-xs">{env.environment}</code>
            {isMockMode ? " · mock data; any credentials are accepted" : null}
          </p>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Reachable only from the management network at{" "}
          <code className="mono-xs">{platformMeta.adminDomain}</code>.
        </p>
      </div>
    </div>
  );
}
