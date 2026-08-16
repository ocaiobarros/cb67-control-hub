import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { api } from "@/api/client";
import type { AuthenticatedUser } from "@/types";

/**
 * FRONTEND GUARDS AND PERMISSION CHECKS ARE UX ONLY.
 * They hide controls the current identity is not expected to use; they are not
 * an authorization boundary. The backend must enforce authentication and RBAC.
 */

interface AuthState {
  user: AuthenticatedUser | null;
  loading: boolean;
  login: (input: { username: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
}

const AuthContext = createContext<AuthState | null>(null);

function matches(granted: string, permission: string): boolean {
  if (granted === "*" || granted === permission) return true;
  if (granted.endsWith(".*")) return permission.startsWith(`${granted.slice(0, -2)}.`);
  if (granted.startsWith("*.")) return permission.endsWith(granted.slice(1));
  return false;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthenticatedUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api
      .currentUser()
      .then((current) => {
        if (active) setUser(current);
      })
      .catch(() => {
        if (active) setUser(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: { username: string; password: string }) => {
    const next = await api.login(input);
    setUser(next);
  }, []);

  const logout = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  const can = useCallback(
    (permission: string) => (user?.permissions ?? []).some((g) => matches(g, permission)),
    [user],
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, can }),
    [user, loading, login, logout, can],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
