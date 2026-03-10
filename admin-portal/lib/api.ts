"use client";

import { getApiBase, getApiBaseCandidates } from "@/lib/auth-context";

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST" | "PATCH" | "DELETE";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const fetchInit: RequestInit = {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  };

  let response: Response | null = null;
  let lastNetworkError: unknown = null;

  // Prefer same-origin proxy first to avoid browser mixed-content/certificate issues.
  try {
    response = await fetch(path, fetchInit);
  } catch (error) {
    lastNetworkError = error;
  }

  if (!response) {
    for (const base of getApiBaseCandidates()) {
      try {
        response = await fetch(`${base}${path}`, fetchInit);
        break;
      } catch (error) {
        lastNetworkError = error;
      }
    }
  }

  if (!response) {
    throw new Error((lastNetworkError as Error)?.message || "Cannot reach API server");
  }

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function getWsUrl(channel: "admin" | "student" | "ADMIN_MONITOR", testCode?: string) {
  const wsBase =
    typeof window !== "undefined"
      ? `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.hostname}:4000`
      : getApiBase().replace(/^http/, "ws");
  const query =
    channel === "student" && testCode
      ? `?channel=student&testCode=${testCode}`
      : channel === "ADMIN_MONITOR"
        ? "?channel=ADMIN_MONITOR"
        : "?channel=admin";
  return `${wsBase}/ws${query}`;
}
