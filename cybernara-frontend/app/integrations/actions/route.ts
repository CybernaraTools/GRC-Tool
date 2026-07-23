import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { loginPath } from "../../../src/lib/auth";
import { createServerApiClient } from "../../../src/lib/api/server";
import { accessTokenCookieName, readSessionContextFromAccessToken } from "../../../src/lib/session";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const session = await readSessionContextFromAccessToken(request.cookies.get(accessTokenCookieName)?.value);
  if (!session) {
    return redirectTo(request, loginPath("/integrations"));
  }

  const api = createServerApiClient(session);
  const intent = text(formData, "intent");

  if (intent === "registerConnector") {
    const connector = await api.registerIntegrationConnector(
      {
        key: text(formData, "key"),
        provider: text(formData, "provider"),
        kind: "identity",
        secretRef: text(formData, "secretRef"),
        scopes: [{ name: "users.read", access: "read", reason: "Collect users for access-review tests." }]
      },
      { idempotencyKey: idempotencyKey(formData, "connector") }
    );
    return redirectTo(request, `/integrations?connectorId=${connector.id}`);
  }

  if (intent === "recordSync") {
    const connectorId = text(formData, "connectorId");
    const result = await api.recordConnectorSyncRun(
      connectorId,
      {
        status: text(formData, "status") === "failed" ? "failed" : "succeeded",
        cursorAfter: text(formData, "cursorAfter"),
        objectCounts: { read: 1, created: 1, updated: 0, deleted: 0 },
        finishedAt: new Date().toISOString(),
        error: text(formData, "status") === "failed" ? "Connector health check failed." : undefined,
        alertOwnerId: text(formData, "ownerId") || session.userId
      },
      { idempotencyKey: idempotencyKey(formData, "sync") }
    );
    return redirectTo(request, `/integrations?connectorId=${result.connector.id}&syncRunId=${result.syncRun.id}`);
  }

  if (intent === "recordObject") {
    const connectorId = text(formData, "connectorId");
    const object = await api.recordConnectorObject(
      connectorId,
      {
        syncRunId: text(formData, "syncRunId"),
        objectType: "user",
        externalId: text(formData, "externalId"),
        sourcePayload: { id: text(formData, "externalId"), mfa: false },
        deliveryStatus: "delivered",
        sourceTimestamp: new Date().toISOString()
      },
      { idempotencyKey: idempotencyKey(formData, "object") }
    );
    return redirectTo(request, `/integrations?connectorId=${connectorId}&syncRunId=${text(formData, "syncRunId")}&objectId=${object.id}`);
  }

  if (intent === "registerWebhook") {
    const webhook = await api.registerWebhookContract(
      {
        key: text(formData, "key"),
        version: text(formData, "version"),
        direction: "outbound",
        signingSecretRef: text(formData, "signingSecretRef"),
        rateLimitPerMinute: 120
      },
      { idempotencyKey: idempotencyKey(formData, "webhook") }
    );
    return redirectTo(request, selectedHref(formData, { webhookId: webhook.id }));
  }

  if (intent === "recordDelivery") {
    const webhookId = text(formData, "webhookId");
    const delivery = await api.recordWebhookDelivery(
      webhookId,
      {
        deliveryIdempotencyKey: text(formData, "deliveryIdempotencyKey"),
        payload: { ticketId: text(formData, "ticketId"), status: "open" },
        deliveryStatus: "delivered",
        attempts: 1,
        observedAt: new Date().toISOString()
      },
      { idempotencyKey: idempotencyKey(formData, "delivery") }
    );
    return redirectTo(request, selectedHref(formData, { webhookId, deliveryId: delivery.id }));
  }

  if (intent === "recordControlTest") {
    const result = await api.recordAutomatedControlTest(
      {
        connectorId: text(formData, "connectorId"),
        controlRef: "SOC2:CC6.1",
        query: "users where mfa = false",
        population: { users: 1 },
        sample: { users: [text(formData, "externalId") || "00u-frontend"] },
        result: { status: "fail", summary: "MFA missing.", evidenceObjectIds: [] },
        sourceTimestamp: new Date().toISOString(),
        ownerId: text(formData, "ownerId") || session.userId
      },
      { idempotencyKey: idempotencyKey(formData, "control-test") }
    );
    return redirectTo(request, selectedHref(formData, { controlTestId: result.controlTest.id, alert: result.alert?.id ?? "" }));
  }

  return NextResponse.json({ error: "Unsupported integration action." }, { status: 400 });
}

function redirectTo(request: NextRequest, href: string) {
  return NextResponse.redirect(new URL(href, request.headers.get("origin") ?? request.url), 303);
}

function selectedHref(formData: FormData, additions: Record<string, string> = {}): string {
  const query = new URLSearchParams();
  for (const key of ["connectorId", "syncRunId", "webhookId"]) {
    const value = text(formData, key);
    if (value) {
      query.set(key, value);
    }
  }
  for (const [key, value] of Object.entries(additions)) {
    if (value) {
      query.set(key, value);
    }
  }
  const suffix = query.toString();
  return suffix ? `/integrations?${suffix}` : "/integrations";
}

function idempotencyKey(formData: FormData, prefix: string): string {
  return text(formData, "idempotencyKey") || `${prefix}-${randomUUID()}`;
}

function text(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}
