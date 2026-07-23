import { randomUUID } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { accessTokenCookieName, readSessionContext, sessionBackendHeaders } from "../../../../src/lib/session";

const backendBaseUrl = process.env.BACKEND_API_BASE_URL ?? "http://localhost:3000";

async function proxy(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const correlationId = request.headers.get("x-correlation-id") || randomUUID();
  const session = await readSessionContext();
  if (!session) {
    return NextResponse.json(
      {
        type: "about:blank",
        title: "Request Error",
        status: 401,
        detail: "A valid Cybernara session is required.",
        instance: request.nextUrl.pathname,
        correlationId
      },
      {
        status: 401,
        headers: { "x-correlation-id": correlationId }
      }
    );
  }

  const { path } = await context.params;
  const normalizedPath = path[0] === "v1" ? path.slice(1) : path;
  const target = new URL(`/v1/${normalizedPath.join("/")}`, backendBaseUrl);
  target.search = request.nextUrl.search;

  const headers = new Headers(request.headers);
  headers.delete("host");
  headers.delete("x-tenant-id");
  headers.delete("x-user-id");
  headers.delete("x-user-roles");
  headers.delete("x-user-scopes");
  headers.delete("x-user-clearance");
  headers.delete("x-platform-role");
  headers.delete("x-user-email");
  headers.set("x-correlation-id", correlationId);
  for (const [key, value] of Object.entries(sessionBackendHeaders(session))) {
    headers.set(key, value);
  }

  const sessionToken = request.cookies.get(accessTokenCookieName)?.value;
  if (sessionToken) {
    headers.set("authorization", `Bearer ${sessionToken}`);
  }

  const response = await fetch(target, {
    method: request.method,
    headers,
    body: request.method === "GET" || request.method === "HEAD" ? undefined : await request.text(),
    cache: "no-store"
  });

  const resHeaders = new Headers(response.headers);
  resHeaders.set("x-correlation-id", correlationId);

  return new NextResponse(response.body, {
    status: response.status,
    headers: resHeaders
  });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
