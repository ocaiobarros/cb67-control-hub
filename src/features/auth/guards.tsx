import { useNavigate } from "@tanstack/react-router";
import { AppLink } from "@/components/common/app-link";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

/** UX-only guards. Real enforcement belongs to the backend and infrastructure. */

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) void navigate({ to: "/login" as never, replace: true });
  }, [loading, user, navigate]);

  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Restoring session…
      </div>
    );
  }
  if (!user) return null;
  return <>{children}</>;
}

export function PublicRoute({ children }: { children: ReactNode }) {
  return <>{children}</>;
}

export function AccessDenied({ permission }: { permission?: string | undefined }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <ShieldAlert className="size-10 text-crit" aria-hidden />
      <div>
        <h1 className="text-xl font-semibold">Acesso negado</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Seu perfil não possui a permissão necessária para esta área
          {permission ? ` (${permission})` : ""}. A autorização é aplicada no servidor.
        </p>
      </div>
      <Button asChild variant="outline">
        <AppLink to="/overview">Voltar para a visão geral</AppLink>
      </Button>
    </div>
  );
}

export function PermissionGuard({
  permission,
  children,
  fallback,
}: {
  permission: string;
  children: ReactNode;
  fallback?: ReactNode | undefined;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <>{fallback ?? <AccessDenied permission={permission} />}</>;
  return <>{children}</>;
}

/** Hides an action when the permission is missing; never a security control. */
export function Permitted({ permission, children }: { permission: string; children: ReactNode }) {
  const { can } = useAuth();
  if (!can(permission)) return null;
  return <>{children}</>;
}
