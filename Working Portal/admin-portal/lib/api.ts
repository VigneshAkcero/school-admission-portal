"use client";

import { getApiBase } from "@/lib/auth-context";

export async function apiRequest<T>(
  path: string,
  options: {
    method?: "GET" | "POST";
    token?: string | null;
    body?: unknown;
  } = {},
): Promise<T> {
  const response = await fetch(`${getApiBase()}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error || "Request failed");
  }

  return payload as T;
}

export function getWsUrl(channel: "admin" | "student" | "ADMIN_MONITOR", testCode?: string) {
  const apiBase = getApiBase();
  const wsBase = apiBase.replace(/^http/, "ws");
  const query =
    channel === "student" && testCode
      ? `?channel=student&testCode=${testCode}`
      : channel === "ADMIN_MONITOR"
        ? "?channel=ADMIN_MONITOR"
        : "?channel=admin";
  return `${wsBase}/ws${query}`;
}
