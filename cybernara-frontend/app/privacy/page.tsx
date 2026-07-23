import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import { accessDeniedDetail, canAccessFeature, canPerform } from "../../src/lib/authorization";
import type {
  ConsentRecord,
  DataInventoryRecord,
  DpiaAssessment,
  PrivacyIncident,
  PrivacyRightsRequest,
  ProcessingActivity,
  RetentionDecisionResponse,
  RetentionSchedule
} from "../../src/lib/api/generated";
import { firstValue, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type PrivacyPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const privacyActionPath = "/privacy/actions";

export default async function PrivacyPage({ searchParams }: PrivacyPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/privacy${serializeSearchParams(params)}`);
  if (!canAccessFeature(session, "privacy")) {
    return (
      <AppShell session={session} title="Privacy Operations">
        <ErrorState title="Feature access unavailable" detail={accessDeniedDetail(session, "privacy")} />
      </AppShell>
    );
  }
  const api = createServerApiClient(session);
  let inventory: DataInventoryRecord[] = [];
  let processing: ProcessingActivity[] = [];
  let dpias: DpiaAssessment[] = [];
  let rightsRequests: PrivacyRightsRequest[] = [];
  let consents: ConsentRecord[] = [];
  let incidents: PrivacyIncident[] = [];
  let retentionSchedules: RetentionSchedule[] = [];
  let retentionDecision: RetentionDecisionResponse | null = null;
  let apiError: string | null = null;

  try {
    [inventory, processing, dpias, rightsRequests, consents, incidents, retentionSchedules] = await Promise.all([
      api.listPrivacyInventoryRecords({ limit: 10, offset: 0 }),
      api.listProcessingActivities({ limit: 10, offset: 0 }),
      api.listDpiaAssessments({ limit: 10, offset: 0 }),
      api.listPrivacyRightsRequests({ limit: 10, offset: 0 }),
      api.listPrivacyConsents({ limit: 10, offset: 0 }),
      api.listPrivacyIncidents({ limit: 10, offset: 0 }),
      api.listRetentionSchedules({ limit: 10, offset: 0 })
    ]);

    const retentionId = textParam(params, "retentionId") || retentionSchedules[0]?.id;
    const ageMonths = Number.parseInt(textParam(params, "ageMonths") || "48", 10);
    if (retentionId && Number.isFinite(ageMonths)) {
      retentionDecision = await api.evaluateRetentionSchedule(retentionId, { ageMonths });
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedProcessingId = textParam(params, "processingId") || processing[0]?.id || "";
  const selectedRights = rightsRequests.find((candidate) => candidate.id === textParam(params, "rightsId")) ?? rightsRequests[0] ?? null;
  const selectedConsent = consents.find((candidate) => candidate.id === textParam(params, "consentId")) ?? consents[0] ?? null;

  return (
    <AppShell session={session} title="Privacy Operations">
      <section className="workspace" aria-labelledby="privacy-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">PrivacyOperations</p>
            <h2 id="privacy-heading">Inventory, RoPA, DPIA, rights, consent, incidents, and retention</h2>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <span>Create and workflow actions only</span>
            <Link href="/privacy/retention" className="badge restricted" style={{ textDecoration: "none" }}>
              Manage Retention & Deletions
            </Link>
          </div>
        </div>
        <div className="constraintNote">
          This page follows the backend contract literally: privacy records are create/read, while rights, consent, and retention expose explicit workflow actions.
        </div>
        {apiError ? <ErrorState title="Privacy workspace could not be loaded" detail={apiError} /> : null}
        {!apiError ? <PrivacySummary inventory={inventory} processing={processing} dpias={dpias} rights={rightsRequests} consents={consents} incidents={incidents} retention={retentionSchedules} /> : null}
      </section>

      {!apiError ? (
        <>
          <InventoryAndRopaPanel processing={processing} inventory={inventory} dpias={dpias} selectedProcessingId={selectedProcessingId} session={session} />
          <RightsAndConsentPanel rights={rightsRequests} selectedRights={selectedRights} selectedConsent={selectedConsent} session={session} />
          <IncidentAndRetentionPanel selectedProcessingId={selectedProcessingId} incidents={incidents} retentionSchedules={retentionSchedules} retentionDecision={retentionDecision} session={session} />
        </>
      ) : null}
    </AppShell>
  );
}

function PrivacySummary({
  inventory,
  processing,
  dpias,
  rights,
  consents,
  incidents,
  retention
}: {
  inventory: DataInventoryRecord[];
  processing: ProcessingActivity[];
  dpias: DpiaAssessment[];
  rights: PrivacyRightsRequest[];
  consents: ConsentRecord[];
  incidents: PrivacyIncident[];
  retention: RetentionSchedule[];
}) {
  return (
    <div className="detailGrid" aria-label="Privacy operations totals">
      <SummaryCard label="Inventory" value={inventory.length} detail={inventory[0]?.systemName ?? "No systems yet"} />
      <SummaryCard label="RoPA" value={processing.length} detail={processing[0]?.purpose ?? "No processing activities yet"} />
      <SummaryCard label="DPIA" value={dpias.length} detail={dpias[0]?.riskLevel ?? "No DPIA yet"} />
      <SummaryCard label="Rights" value={rights.length} detail={rights[0]?.status ?? "No requests yet"} />
      <SummaryCard label="Consent" value={consents.length} detail={consents[0]?.status ?? "No consent yet"} />
      <SummaryCard label="Incidents" value={incidents.length} detail={incidents[0]?.severity ?? "No incidents yet"} />
      <SummaryCard label="Retention" value={retention.length} detail={retention[0]?.legalHold ? "Legal hold active" : "No schedule yet"} />
    </div>
  );
}

function InventoryAndRopaPanel({
  processing,
  inventory,
  dpias,
  selectedProcessingId,
  session
}: {
  processing: ProcessingActivity[];
  inventory: DataInventoryRecord[];
  dpias: DpiaAssessment[];
  selectedProcessingId: string;
  session: { roles: string[]; scopes: string[] };
}) {
  return (
    <section className="workspace" aria-labelledby="ropa-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Inventory and RoPA</p>
          <h2 id="ropa-heading">Processing activity foundation</h2>
        </div>
        <span>{processing.length} activities</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="createProcessing" label="Create processing activity" allowed={canPerform(session, "processing_activity:write")} />
        <ActionForm intent="createInventory" label="Create inventory record" hidden={{ processingId: selectedProcessingId }} disabled={!selectedProcessingId} allowed={canPerform(session, "data_inventory_record:write")} />
        <ActionForm intent="createDpia" label="Create DPIA assessment" hidden={{ processingId: selectedProcessingId }} disabled={!selectedProcessingId} allowed={canPerform(session, "dpia_assessment:write")} />
      </div>
      {processing.length === 0 ? (
        <EmptyState title="No processing activity yet" detail="Create a RoPA processing activity before linking inventory or DPIA records." />
      ) : (
        <div className="tableScroller">
          <table>
            <caption>Privacy processing activities</caption>
            <thead>
              <tr>
                <th scope="col">Purpose</th>
                <th scope="col">Lawful basis</th>
                <th scope="col">Retention</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {processing.map((activity) => (
                <tr key={activity.id}>
                  <td>{activity.purpose}<small>{activity.jurisdiction}</small></td>
                  <td>{activity.lawfulBasis}</td>
                  <td>{activity.retentionMonths} months</td>
                  <td><Link href={`/privacy?processingId=${activity.id}`}>Use for linked actions</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="detailGrid">
        <SummaryCard label="Latest inventory system" value={inventory[0]?.systemName ?? "None"} detail={inventory[0]?.classification ?? "Create from selected RoPA"} />
        <SummaryCard label="Latest DPIA risk" value={dpias[0]?.riskLevel ?? "None"} detail={dpias[0] ? `${dpias[0].residualRiskScore} residual score` : "Awaiting assessment"} />
      </div>
    </section>
  );
}

function RightsAndConsentPanel({
  rights,
  selectedRights,
  selectedConsent,
  session
}: {
  rights: PrivacyRightsRequest[];
  selectedRights: PrivacyRightsRequest | null;
  selectedConsent: ConsentRecord | null;
  session: { roles: string[]; scopes: string[] };
}) {
  const canWriteRights = canPerform(session, "privacy_rights_request:write");
  const canWriteConsent = canPerform(session, "consent_record:write");
  return (
    <section className="workspace" aria-labelledby="rights-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Rights and consent</p>
          <h2 id="rights-heading">Data-subject workflow</h2>
        </div>
        <span>{rights.length} rights requests</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="createRights" label="Create rights request" allowed={canWriteRights} />
        <ActionForm intent="verifyRights" label="Verify identity" hidden={{ rightsId: selectedRights?.id ?? "" }} disabled={!selectedRights} allowed={canWriteRights} />
        <ActionForm intent="addSearchTask" label="Add search task" hidden={{ rightsId: selectedRights?.id ?? "" }} disabled={!selectedRights} allowed={canWriteRights} />
        <ActionForm intent="completeRights" label="Complete rights request" hidden={{ rightsId: selectedRights?.id ?? "" }} disabled={!selectedRights} allowed={canWriteRights} />
        <ActionForm intent="grantConsent" label="Grant consent" allowed={canWriteConsent} />
        <ActionForm intent="withdrawConsent" label="Withdraw consent" hidden={{ consentId: selectedConsent?.id ?? "" }} disabled={!selectedConsent} allowed={canWriteConsent} />
      </div>
      <div className="detailGrid">
        <SummaryCard label="Selected rights request" value={selectedRights?.status ?? "None"} detail={selectedRights ? `${selectedRights.requestType} for ${selectedRights.subjectId}` : "Create a request to begin"} />
        <SummaryCard label="Identity verified" value={selectedRights?.identityVerified ? "Yes" : "No"} detail={`${selectedRights?.searchTasks?.length ?? 0} search tasks`} />
        <SummaryCard label="Latest consent" value={selectedConsent?.status ?? "None"} detail={selectedConsent ? `${selectedConsent.purpose} ${selectedConsent.region}` : "No consent record"} />
      </div>
      {rights.length > 0 ? (
        <div className="tableScroller">
          <table>
            <caption>Rights request queue</caption>
            <thead>
              <tr>
                <th scope="col">Subject</th>
                <th scope="col">Type</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {rights.map((request) => (
                <tr key={request.id}>
                  <td>{request.subjectId}</td>
                  <td>{request.requestType}</td>
                  <td><span className="badge internal">{request.status}</span></td>
                  <td><Link href={`/privacy?rightsId=${request.id}`}>Select</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function IncidentAndRetentionPanel({
  selectedProcessingId,
  incidents,
  retentionSchedules,
  retentionDecision,
  session
}: {
  selectedProcessingId: string;
  incidents: PrivacyIncident[];
  retentionSchedules: RetentionSchedule[];
  retentionDecision: RetentionDecisionResponse | null;
  session: { roles: string[]; scopes: string[] };
}) {
  return (
    <section className="workspace" aria-labelledby="incident-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Incidents and retention</p>
          <h2 id="incident-heading">Response and legal hold evaluation</h2>
        </div>
        <span>{incidents.length} incidents</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="createIncident" label="Create privacy incident" hidden={{ processingId: selectedProcessingId }} disabled={!selectedProcessingId} allowed={canPerform(session, "privacy_incident:write")} />
        <ActionForm intent="createRetention" label="Create retention schedule" allowed={canPerform(session, "retention_schedule:write")} />
      </div>
      <div className="detailGrid">
        <SummaryCard label="Latest incident severity" value={incidents[0]?.severity ?? "None"} detail={incidents[0] ? "Regulatory clocks are calculated by the backend." : "Create from selected RoPA"} />
        <SummaryCard label="Retention schedules" value={retentionSchedules.length} detail={retentionSchedules[0]?.dataCategory ?? "No schedule yet"} />
        <SummaryCard label="Evaluation at 48 months" value={retentionDecision?.decision ?? "Not evaluated"} detail={retentionDecision ? `Schedule ${retentionDecision.scheduleId.slice(0, 8)}` : "Create a schedule to evaluate"} />
      </div>
    </section>
  );
}

function ActionForm({
  intent,
  label,
  hidden,
  disabled = false,
  allowed = true
}: {
  intent: string;
  label: string;
  hidden?: Record<string, string>;
  disabled?: boolean;
  allowed?: boolean;
}) {
  if (!allowed) {
    return null;
  }
  return (
    <form className="miniForm" action={privacyActionPath} method="post" aria-label={label}>
      <input type="hidden" name="intent" value={intent} />
      <HiddenIdempotency />
      {Object.entries(hidden ?? {}).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <button type="submit" disabled={disabled}>{label}</button>
    </form>
  );
}

function SummaryCard({ label, value, detail }: { label: string; value: string | number; detail: string }) {
  return (
    <article>
      <span className="label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
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
