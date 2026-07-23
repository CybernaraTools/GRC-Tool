import { randomUUID } from "node:crypto";
import { createCybernaraClient, CybernaraApiError } from "./generated";
import { sessionBackendHeaders, type SessionContext } from "../session";

/**
 * Every call made through a single client instance shares one correlation ID, so all
 * backend requests triggered by rendering one page (or one server action) trace back to
 * the same origin in backend audit logs / problem-details responses.
 */
export function createServerApiClient(session: SessionContext) {
  const baseUrl = process.env.BACKEND_API_BASE_URL ?? "http://localhost:3000";
  const correlationId = randomUUID();
  return createCybernaraClient(baseUrl, async (input, init) => {
    const headers = new Headers(init?.headers);
    for (const [key, value] of Object.entries(sessionBackendHeaders(session))) {
      headers.set(key, value);
    }
    headers.set("x-correlation-id", correlationId);

    return fetch(input, {
      ...init,
      headers,
      cache: "no-store"
    });
  });
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof CybernaraApiError) {
    return error.problem?.detail ?? error.message;
  }
  return error instanceof Error ? error.message : "Unexpected API error.";
}
