"use client";

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

  // Always use the same-origin proxy route through Next.js API
  const response = await fetch(path, fetchInit);

  if (!response.ok) {
    const payload = await response.json();
    throw new Error(payload.error || "Request failed");
  }

  return response.json() as Promise<T>;
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
