import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type {
  AssuranceAlert,
  AutomatedControlTest,
  ConnectorObject,
  ConnectorSyncRun,
  IntegrationConnector,
  WebhookContract,
  WebhookDelivery
} from "../../src/lib/api/generated";
import { firstValue, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type IntegrationsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const integrationActionPath = "/integrations/actions";

export default async function IntegrationsPage({ searchParams }: IntegrationsPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/integrations${serializeSearchParams(params)}`);
  const api = createServerApiClient(session);
  let connectors: IntegrationConnector[] = [];
  let selectedConnector: IntegrationConnector | null = null;
  let syncRuns: ConnectorSyncRun[] = [];
  let objects: ConnectorObject[] = [];
  let webhooks: WebhookContract[] = [];
  let selectedWebhook: WebhookContract | null = null;
  let deliveries: WebhookDelivery[] = [];
  let controlTests: AutomatedControlTest[] = [];
  let alerts: AssuranceAlert[] = [];
  let apiError: string | null = null;

  try {
    [connectors, webhooks, controlTests, alerts] = await Promise.all([
      api.listIntegrationConnectors({ limit: 10, offset: 0 }),
      api.listWebhookContracts({ limit: 10, offset: 0 }),
      api.listAutomatedControlTests({ limit: 10, offset: 0 }),
      api.listAssuranceAlerts({ status: "triaged", limit: 10, offset: 0 })
    ]);
    const connectorId = textParam(params, "connectorId") || connectors[0]?.id;
    selectedConnector = connectorId ? connectors.find((connector) => connector.id === connectorId) ?? null : null;
    if (selectedConnector) {
      [syncRuns, objects] = await Promise.all([
        api.listConnectorSyncRuns(selectedConnector.id, { limit: 10, offset: 0 }),
        api.listConnectorObjects(selectedConnector.id, { limit: 10, offset: 0 })
      ]);
    }
    const webhookId = textParam(params, "webhookId") || webhooks[0]?.id;
    selectedWebhook = webhookId ? webhooks.find((webhook) => webhook.id === webhookId) ?? null : null;
    if (selectedWebhook) {
      deliveries = await api.listWebhookDeliveries(selectedWebhook.id, { limit: 10, offset: 0 });
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedSyncRun = textParam(params, "syncRunId") || syncRuns[0]?.id || "";

  return (
    <AppShell session={session} title="Integration Command Center">
      <section className="workspace" aria-labelledby="integrations-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">IntegrationPlatform</p>
            <h2 id="integrations-heading">Connectors and continuous assurance</h2>
          </div>
          <span>Secret references only</span>
        </div>
        <div className="constraintNote">
          Connector credentials are registered by `secret://...` reference only. This UI does not collect raw OAuth tokens or service-account secrets because the backend contract rejects them.
        </div>
        {apiError ? <ErrorState title="Integration workspace could not be loaded" detail={apiError} /> : null}
        {!apiError ? <RegisterConnectorForm /> : null}
      </section>

      {!apiError ? (
        <>
          <ConnectorPanel connectors={connectors} selectedConnector={selectedConnector} syncRuns={syncRuns} objects={objects} ownerId={session.userId} selectedSyncRun={selectedSyncRun} />
          <WebhookPanel webhooks={webhooks} selectedWebhook={selectedWebhook} deliveries={deliveries} selectedConnector={selectedConnector} selectedSyncRun={selectedSyncRun} />
          <ControlTestPanel tests={controlTests} alerts={alerts} selectedConnector={selectedConnector} ownerId={session.userId} />
        </>
      ) : null}
    </AppShell>
  );
}

function RegisterConnectorForm() {
  const suffix = randomUUID().slice(0, 8);
  return (
    <form className="filterForm" action={integrationActionPath} method="post" aria-label="Register connector">
      <input type="hidden" name="intent" value="registerConnector" />
      <HiddenIdempotency />
      <label>
        Connector key
        <input name="key" defaultValue={`okta-${suffix}`} required />
      </label>
      <label>
        Provider
        <input name="provider" defaultValue="Okta" required />
      </label>
      <label>
        Secret reference
        <input name="secretRef" defaultValue={`secret://tenant/okta-${suffix}`} required />
      </label>
      <div className="formActions">
        <button type="submit">Register connector</button>
      </div>
    </form>
  );
}

function ConnectorPanel({
  connectors,
  selectedConnector,
  syncRuns,
  objects,
  ownerId,
  selectedSyncRun
}: {
  connectors: IntegrationConnector[];
  selectedConnector: IntegrationConnector | null;
  syncRuns: ConnectorSyncRun[];
  objects: ConnectorObject[];
  ownerId: string;
  selectedSyncRun: string;
}) {
  return (
    <section className="workspace" aria-labelledby="connector-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Connector health and sync</p>
          <h2 id="connector-heading">Registered connectors</h2>
        </div>
        <span>{connectors.length} connectors</span>
      </div>
      {connectors.length === 0 ? (
        <EmptyState title="No connectors yet" detail="Register a secret-referenced connector to begin the sync flow." />
      ) : (
        <div className="tableScroller">
          <table>
            <caption>Connector inventory</caption>
            <thead>
              <tr>
                <th scope="col">Connector</th>
                <th scope="col">Health</th>
                <th scope="col">Sync cursor</th>
                <th scope="col">Secret ref</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {connectors.map((connector) => (
                <tr key={connector.id}>
                  <td>{connector.key}<small>{connector.provider}</small></td>
                  <td><span className="badge internal">{connector.health}</span></td>
                  <td><code>{String(connector.syncCursor ?? "none")}</code></td>
                  <td><code>{connector.secretRef}</code></td>
                  <td><Link href={`/integrations?connectorId=${connector.id}`}>Select</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedConnector ? (
        <>
          <div className="workflowGrid">
            <form className="miniForm" action={integrationActionPath} method="post" aria-label="Record sync run">
              <input type="hidden" name="intent" value="recordSync" />
              <input type="hidden" name="connectorId" value={selectedConnector.id} />
              <input type="hidden" name="ownerId" value={ownerId} />
              <HiddenIdempotency />
              <label>
                Sync status
                <select name="status" defaultValue="succeeded">
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed with alert</option>
                </select>
              </label>
              <label>
                Cursor after
                <input name="cursorAfter" defaultValue={`cursor-${randomUUID().slice(0, 8)}`} />
              </label>
              <button type="submit">Record sync status</button>
            </form>
            <form className="miniForm" action={integrationActionPath} method="post" aria-label="Record connector object">
              <input type="hidden" name="intent" value="recordObject" />
              <input type="hidden" name="connectorId" value={selectedConnector.id} />
              <input type="hidden" name="syncRunId" value={selectedSyncRun} />
              <HiddenIdempotency />
              <label>
                External object ID
                <input name="externalId" defaultValue={`00u-${randomUUID().slice(0, 8)}`} />
              </label>
              <button type="submit" disabled={!selectedSyncRun}>Record connector object</button>
            </form>
          </div>
          <div className="detailGrid">
            <article>
              <span className="label">Sync runs</span>
              <strong>{syncRuns.length}</strong>
              <small>{syncRuns[0]?.status ?? "No sync yet"}</small>
            </article>
            <article>
              <span className="label">Connector objects</span>
              <strong>{objects.length}</strong>
              <small>{objects[0]?.externalId ?? "No objects yet"}</small>
            </article>
          </div>
        </>
      ) : null}
    </section>
  );
}

function WebhookPanel({
  webhooks,
  selectedWebhook,
  deliveries,
  selectedConnector,
  selectedSyncRun
}: {
  webhooks: WebhookContract[];
  selectedWebhook: WebhookContract | null;
  deliveries: WebhookDelivery[];
  selectedConnector: IntegrationConnector | null;
  selectedSyncRun: string;
}) {
  return (
    <section className="workspace" aria-labelledby="webhook-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Webhook contracts</p>
          <h2 id="webhook-heading">Delivery log</h2>
        </div>
        <span>{webhooks.length} contracts</span>
      </div>
      <div className="workflowGrid">
        <form className="miniForm" action={integrationActionPath} method="post" aria-label="Register webhook contract">
          <input type="hidden" name="intent" value="registerWebhook" />
          <input type="hidden" name="connectorId" value={selectedConnector?.id ?? ""} />
          <input type="hidden" name="syncRunId" value={selectedSyncRun} />
          <HiddenIdempotency />
          <label>
            Webhook key
            <input name="key" defaultValue={`ticket-created-${randomUUID().slice(0, 8)}`} />
          </label>
          <label>
            Version
            <input name="version" defaultValue="v1.0.0" />
          </label>
          <label>
            Signing secret ref
            <input name="signingSecretRef" defaultValue="secret://tenant/webhooks/ticket-created" />
          </label>
          <button type="submit">Register webhook contract</button>
        </form>
        {selectedWebhook ? (
          <form className="miniForm" action={integrationActionPath} method="post" aria-label="Record webhook delivery">
            <input type="hidden" name="intent" value="recordDelivery" />
            <input type="hidden" name="connectorId" value={selectedConnector?.id ?? ""} />
            <input type="hidden" name="syncRunId" value={selectedSyncRun} />
            <input type="hidden" name="webhookId" value={selectedWebhook.id} />
            <HiddenIdempotency />
            <label>
              Delivery idempotency key
              <input name="deliveryIdempotencyKey" defaultValue={`ticket-created:${randomUUID().slice(0, 8)}`} />
            </label>
            <label>
              Ticket ID
              <input name="ticketId" defaultValue={`F4-${randomUUID().slice(0, 6)}`} />
            </label>
            <button type="submit">Record delivery</button>
          </form>
        ) : null}
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Latest webhook</span>
          <strong>{selectedWebhook?.key ?? "No webhook selected"}</strong>
          <small>{selectedWebhook?.signingSecretRef ?? "Secret ref required"}</small>
        </article>
        <article>
          <span className="label">Deliveries</span>
          <strong>{deliveries.length}</strong>
          <small>{deliveries[0]?.deliveryStatus ?? "No delivery yet"}</small>
        </article>
        <article>
          <span className="label">Contracts</span>
          <strong>{webhooks.length}</strong>
          {webhooks[0] ? <Link href={`/integrations?webhookId=${webhooks[0].id}${selectedConnector ? `&connectorId=${selectedConnector.id}` : ""}`}>Select latest webhook</Link> : null}
        </article>
      </div>
    </section>
  );
}

function ControlTestPanel({
  tests,
  alerts,
  selectedConnector,
  ownerId
}: {
  tests: AutomatedControlTest[];
  alerts: AssuranceAlert[];
  selectedConnector: IntegrationConnector | null;
  ownerId: string;
}) {
  return (
    <section className="workspace" aria-labelledby="assurance-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Continuous assurance</p>
          <h2 id="assurance-heading">Control tests and alerts</h2>
        </div>
        <span>{alerts.length} triaged alerts</span>
      </div>
      <form className="filterForm" action={integrationActionPath} method="post" aria-label="Record automated control test">
        <input type="hidden" name="intent" value="recordControlTest" />
        <input type="hidden" name="connectorId" value={selectedConnector?.id ?? ""} />
        <input type="hidden" name="ownerId" value={ownerId} />
        <HiddenIdempotency />
        <label>
          External object sample
          <input name="externalId" defaultValue={`00u-${randomUUID().slice(0, 8)}`} />
        </label>
        <div className="formActions">
          <button type="submit" disabled={!selectedConnector}>Record failing control test</button>
        </div>
      </form>
      <div className="detailGrid">
        <article>
          <span className="label">Control tests</span>
          <strong>{tests.length}</strong>
          <small>{tests[0]?.result.summary ?? "No tests yet"}</small>
        </article>
        <article>
          <span className="label">Alerts</span>
          <strong>{alerts.length}</strong>
          <small>{alerts[0]?.reason ?? "No triaged alert yet"}</small>
        </article>
        <article>
          <span className="label">Drift state</span>
          <strong>{alerts.length > 0 ? "Attention required" : "No triaged drift"}</strong>
        </article>
      </div>
    </section>
  );
}

function HiddenIdempotency() {
  return <input type="hidden" name="idempotencyKey" value={randomUUID()} />;
}

function textParam(params: SearchParamsRecord, key: string): string {
  return firstValue(params[key]).trim();
}

function serializeSearchParams(params: SearchParamsRecord): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value) {
      search.set(key, value);
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
