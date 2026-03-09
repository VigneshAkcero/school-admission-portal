"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";

export type UserRole = "admin" | "principal" | "receptionist";

export interface AuthUser {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isReady: boolean;
  isAuthChecked: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<unknown>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = "montessori_admin_auth";
function resolveApiBase() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  }

  const { hostname, protocol } = window.location;
  const apiProtocol = protocol === "https:" ? "https:" : "http:";
  return `${apiProtocol}//${hostname}:4000`;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as { token: string; user: AuthUser };
        setToken(parsed.token);
        setUser(parsed.user);
      } catch {
        sessionStorage.removeItem(STORAGE_KEY);
      }
    }
    setIsReady(true);
  }, []);

  const login = useCallback(async (username: string, password: string) => {
    setIsLoading(true);
    try {
      const apiBase = resolveApiBase();
      const response = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        return { ok: false as const, error: data.error || "Login failed" };
      }

      const nextUser = data.user as AuthUser;
      nextUser.name = data.user?.name || data.user?.email || "User";
      const nextToken = data.token as string;

      setUser(nextUser);
      setToken(nextToken);
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ user: nextUser, token: nextToken }));

      return { ok: true as const, role: nextUser.role };
    } catch {
      return { ok: false as const, error: "Cannot reach API server" };
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
    setToken(null);
    router.push("/login");
  }, [router]);

  const value = useMemo(
    () => ({ user, token, isReady, isAuthChecked: isReady, isLoading, login, logout }),
    [user, token, isReady, isLoading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

export function getApiBase() {
  return resolveApiBase();
}

export function getHomePathForRole(role: UserRole) {
  if (role === "admin") return "/dashboard";
  if (role === "principal") return "/principal";
  return "/receptionist";
}
