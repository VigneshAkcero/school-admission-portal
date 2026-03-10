import { NextRequest, NextResponse } from "next/server";

const BACKEND_BASE = process.env.BACKEND_API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000";

function buildBackendUrl(base: string, pathnameParts: string[], searchParams: URLSearchParams) {
  const normalizedBase = base.replace(/\/+$/, "");
  const path = pathnameParts.join("/");
  const query = searchParams.toString();
  return `${normalizedBase}/api/${path}${query ? `?${query}` : ""}`;
}

function getBackendCandidates() {
  const values = [
    BACKEND_BASE,
    "http://localhost:4000",
    "https://localhost:4000",
    "http://127.0.0.1:4000",
    "https://127.0.0.1:4000",
  ];
  return values.filter((value, index) => Boolean(value) && values.indexOf(value) === index);
}

async function forward(request: NextRequest, method: string, params: { path: string[] }) {
  const incomingContentType = request.headers.get("content-type");
  const auth = request.headers.get("authorization");

  const headers: Record<string, string> = {};
  if (incomingContentType) headers["content-type"] = incomingContentType;
  if (auth) headers["authorization"] = auth;

  const init: RequestInit = {
    method,
    headers,
    cache: "no-store",
  };

  if (method !== "GET" && method !== "HEAD") {
    init.body = await request.text();
  }

  for (const candidate of getBackendCandidates()) {
    const backendUrl = buildBackendUrl(candidate, params.path, request.nextUrl.searchParams);
    try {
      const upstream = await fetch(backendUrl, init);
      const text = await upstream.text();
      const response = new NextResponse(text, { status: upstream.status });
      const upstreamType = upstream.headers.get("content-type");
      if (upstreamType) response.headers.set("content-type", upstreamType);
      return response;
    } catch {
      // Try next backend candidate.
    }
  }

  return NextResponse.json({ error: "Cannot reach API server" }, { status: 502 });
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return forward(request, "GET", params);
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return forward(request, "POST", params);
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return forward(request, "PATCH", params);
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const params = await context.params;
  return forward(request, "DELETE", params);
}
