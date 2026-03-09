"use client";

function resolveApiBase() {
  if (typeof window === "undefined") {
    return process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";
  }

  const { hostname, protocol } = window.location;
  const apiProtocol = protocol === "https:" ? "https:" : "http:";
  return `${apiProtocol}//${hostname}:4000`;
}

export function getApiBase() {
  return resolveApiBase();
}

export async function studentApi<T>(path: string, options: { method?: "GET" | "POST"; body?: unknown } = {}) {
  const apiBase = resolveApiBase();
  const response = await fetch(`${apiBase}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json" },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data as T;
}

export function getStudentWsUrl(testCode: string) {
  return `${resolveApiBase().replace(/^http/, "ws")}/ws?channel=student&testCode=${testCode}`;
}
