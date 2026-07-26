import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import { accessDeniedDetail, canAccessFeature, canCreateRisk, canPerform } from "../../src/lib/authorization";
import type {
  AccessReview,
  AuditEngagement,
  CustomObjectDefinition,
  GrcWorkspace,
  PolicyVersion,
  Risk,
  RiskModel,
  TrustCenterArtifact,
  VendorRecord
} from "../../src/lib/api/generated";
import { firstValue, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type EnterprisePageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const enterpriseActionPath = "/enterprise/actions";

export default async function EnterprisePage({ searchParams }: EnterprisePageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/enterprise${serializeSearchParams(params)}`);
  if (!canAccessFeature(session, "enterprise")) {
    return (
      <AppShell session={session} title="Enterprise GRC">
        <ErrorState title="Feature access unavailable" detail={accessDeniedDetail(session, "enterprise")} />
      </AppShell>
    );
  }
  const api = createServerApiClient(session);
  let policies: PolicyVersion[] = [];
  let reviews: AccessReview[] = [];
  let vendors: VendorRecord[] = [];
  let audits: AuditEngagement[] = [];
  let artifacts: TrustCenterArtifact[] = [];
  let workspaces: GrcWorkspace[] = [];
  let definitions: CustomObjectDefinition[] = [];
  let risks: Risk[] = [];
  let riskModels: RiskModel[] = [];
  let apiError: string | null = null;

  try {
    [policies, reviews, vendors, audits, artifacts, workspaces, definitions, risks, riskModels] = await Promise.all([
      api.listEnterprisePolicies({ limit: 10, offset: 0 }),
      api.listEnterpriseAccessReviews({ limit: 10, offset: 0 }),
      api.listEnterpriseVendors({ limit: 10, offset: 0 }),
      api.listEnterpriseAuditEngagements({ limit: 10, offset: 0 }),
      api.listEnterpriseTrustArtifacts({ limit: 10, offset: 0 }),
      api.listEnterpriseWorkspaces({ limit: 10, offset: 0 }),
      api.listEnterpriseCustomObjectDefinitions({ limit: 10, offset: 0 }),
      api.listRisks({ limit: 10, offset: 0 }),
      api.listRiskModels({ limit: 10, offset: 0 })
    ]);
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedPolicy = policies.find((policy) => policy.id === textParam(params, "policyId")) ?? policies[0] ?? null;
  const selectedArtifact = artifacts.find((artifact) => artifact.id === textParam(params, "artifactId")) ?? artifacts[0] ?? null;

  return (
    <AppShell session={session} title="Enterprise GRC">
      <section className="workspace" aria-labelledby="enterprise-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">EnterpriseGRC</p>
            <h2 id="enterprise-heading">Policies, vendors, access reviews, audits, trust, workspaces, and custom objects</h2>
          </div>
          <div>
            <span>Domain-modeled actions only</span>
            <Link href="/enterprise/custom-objects" className="badge restricted">
              Custom Object Builder
            </Link>
          </div>
        </div>
        <div className="constraintNote">
          Enterprise sub-resources such as questionnaires, monitoring findings, contracts, and remediation references are represented as ID arrays or JSON fields by the backend, not separate edit pages.
        </div>
        {apiError ? <ErrorState title="Enterprise workspace could not be loaded" detail={apiError} /> : null}
        {!apiError ? <EnterpriseSummary policies={policies} reviews={reviews} vendors={vendors} audits={audits} artifacts={artifacts} workspaces={workspaces} definitions={definitions} /> : null}
      </section>

      {!apiError ? (
        <>
          <PolicyPanel policies={policies} selectedPolicy={selectedPolicy} session={session} />
          <RiskAndAssurancePanel reviews={reviews} vendors={vendors} audits={audits} session={session} />
          <RiskRegisterPanel risks={risks} models={riskModels} session={session} />
          <TrustAndPlatformPanel artifacts={artifacts} selectedArtifact={selectedArtifact} workspaces={workspaces} definitions={definitions} session={session} />
        </>
      ) : null}
    </AppShell>
  );
}

function EnterpriseSummary({
  policies,
  reviews,
  vendors,
  audits,
  artifacts,
  workspaces,
  definitions
}: {
  policies: PolicyVersion[];
  reviews: AccessReview[];
  vendors: VendorRecord[];
  audits: AuditEngagement[];
  artifacts: TrustCenterArtifact[];
  workspaces: GrcWorkspace[];
  definitions: CustomObjectDefinition[];
}) {
  return (
    <div className="detailGrid" aria-label="Enterprise GRC totals">
      <SummaryCard label="Policies" value={policies.length} detail={policies[0]?.status ?? "No policy yet"} />
      <SummaryCard label="Access reviews" value={reviews.length} detail={reviews[0]?.populationSource ?? "No review yet"} />
      <SummaryCard label="Vendors" value={vendors.length} detail={vendors[0]?.tier ?? "No vendor yet"} />
      <SummaryCard label="Audits" value={audits.length} detail={audits[0]?.status ?? "No audit yet"} />
      <SummaryCard label="Trust artifacts" value={artifacts.length} detail={artifacts[0]?.visibility ?? "No artifact yet"} />
      <SummaryCard label="Workspaces" value={workspaces.length} detail={workspaces[0]?.businessUnit ?? "No workspace yet"} />
      <SummaryCard label="Custom objects" value={definitions.length} detail={definitions[0]?.objectKey ?? "No definition yet"} />
    </div>
  );
}

function PolicyPanel({ policies, selectedPolicy, session }: { policies: PolicyVersion[]; selectedPolicy: PolicyVersion | null; session: { roles: string[]; scopes: string[] } }) {
  const canWritePolicy = canPerform(session, "policy_version:write");
  return (
    <section className="workspace" aria-labelledby="policy-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Policy lifecycle</p>
          <h2 id="policy-heading">Draft, publish, and exception workflow</h2>
        </div>
        <span>{policies.length} policies</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="draftPolicy" label="Draft policy" allowed={canWritePolicy} />
        <ActionForm intent="publishPolicy" label="Publish selected policy" hidden={{ policyId: selectedPolicy?.id ?? "" }} disabled={!selectedPolicy || selectedPolicy.status === "published"} allowed={canWritePolicy} />
        <ActionForm intent="addPolicyException" label="Add policy exception" hidden={{ policyId: selectedPolicy?.id ?? "" }} disabled={!selectedPolicy} allowed={canWritePolicy} />
      </div>
      <div className="detailGrid">
        <SummaryCard label="Selected policy" value={selectedPolicy?.status ?? "None"} detail={selectedPolicy?.title ?? "Draft a policy to begin"} />
        <SummaryCard label="Exceptions" value={selectedPolicy?.exceptions?.length ?? 0} detail="Explicit exception workflow, not generic edit" />
        <SummaryCard label="Content hash" value={selectedPolicy?.contentHash.slice(0, 10) ?? "None"} detail="Backend-derived immutable content signature" />
      </div>
      {policies.length > 0 ? (
        <div className="tableScroller">
          <table>
            <caption>Enterprise policy versions</caption>
            <thead>
              <tr>
                <th scope="col">Title</th>
                <th scope="col">Version</th>
                <th scope="col">Status</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {policies.map((policy) => (
                <tr key={policy.id}>
                  <td>{policy.title}<small>{policy.templateKey}</small></td>
                  <td>{policy.version}</td>
                  <td><span className="badge internal">{policy.status}</span></td>
                  <td><Link className="reviewLink" href={`/enterprise?policyId=${policy.id}`}>Select</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}

function RiskAndAssurancePanel({
  reviews,
  vendors,
  audits,
  session
}: {
  reviews: AccessReview[];
  vendors: VendorRecord[];
  audits: AuditEngagement[];
  session: { roles: string[]; scopes: string[] };
}) {
  return (
    <section className="workspace" aria-labelledby="risk-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Access, vendor, and audit management</p>
          <h2 id="risk-heading">Enterprise assurance records</h2>
        </div>
        <span>{vendors.length} vendors</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="createAccessReview" label="Create access review" allowed={canPerform(session, "access_review:write")} />
        <ActionForm intent="createVendor" label="Create vendor record" allowed={canPerform(session, "vendor:write")} />
        <ActionForm intent="createAudit" label="Create audit engagement" allowed={canPerform(session, "audit_engagement:write")} />
      </div>
      <div className="detailGrid">
        <SummaryCard label="Latest review" value={reviews[0]?.populationSource ?? "None"} detail={`${reviews[0]?.remediationTaskIds.length ?? 0} remediation refs`} />
        <SummaryCard label="Latest vendor" value={vendors[0]?.name ?? "None"} detail={vendors[0] ? `${vendors[0].contractIds.length} contract refs` : "ID-array subresources"} />
        <SummaryCard label="Latest audit" value={audits[0]?.name ?? "None"} detail={audits[0]?.status ?? "No engagement"} />
      </div>
    </section>
  );
}

function TrustAndPlatformPanel({
  artifacts,
  selectedArtifact,
  workspaces,
  definitions,
  session
}: {
  artifacts: TrustCenterArtifact[];
  selectedArtifact: TrustCenterArtifact | null;
  workspaces: GrcWorkspace[];
  definitions: CustomObjectDefinition[];
  session: { roles: string[]; scopes: string[] };
}) {
  return (
    <section className="workspace" aria-labelledby="trust-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Trust center and platform extensibility</p>
          <h2 id="trust-heading">Artifacts, workspaces, and custom objects</h2>
        </div>
        <span>{artifacts.length} artifacts</span>
      </div>
      <div className="workflowGrid">
        <ActionForm intent="publishTrustArtifact" label="Publish trust artifact" allowed={canPerform(session, "trust_center_artifact:write")} />
        <ActionForm intent="recordTrustDownload" label="Record trust download" hidden={{ artifactId: selectedArtifact?.id ?? "" }} disabled={!selectedArtifact} allowed={canPerform(session, "trust_center_artifact:write")} />
        <ActionForm intent="createWorkspace" label="Create workspace" allowed={canPerform(session, "grc_workspace:write")} />
        <ActionForm intent="createCustomObject" label="Create custom object definition" allowed={canPerform(session, "custom_object_definition:write")} />
      </div>
      <div className="detailGrid">
        <SummaryCard label="Selected artifact" value={selectedArtifact?.title ?? "None"} detail={`${selectedArtifact?.downloadEvents?.length ?? 0} downloads recorded`} />
        <SummaryCard label="Latest workspace" value={workspaces[0]?.businessUnit ?? "None"} detail={`${workspaces[0]?.delegatedAdminIds.length ?? 0} delegated admins`} />
        <SummaryCard label="Latest custom object" value={definitions[0]?.objectKey ?? "None"} detail={definitions[0]?.connectorSdkEnabled ? "Connector SDK enabled" : "No definition"} />
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
    <form className="miniForm" action={enterpriseActionPath} method="post" aria-label={label}>
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

function RiskRegisterPanel({
  risks,
  models,
  session
}: {
  risks: Risk[];
  models: RiskModel[];
  session: { roles: string[]; scopes: string[] };
}) {
  const canWriteRisk = canCreateRisk(session);
  if (!canWriteRisk) {
    return null;
  }

  return (
    <section className="workspace" aria-labelledby="risk-register-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Enterprise Risk Register</p>
          <h2 id="risk-register-heading">Risks and risk modeling</h2>
        </div>
        <span>{risks.length} active risks</span>
      </div>
      <div className="workflowGrid">
        <form className="miniForm" action={enterpriseActionPath} method="post" aria-label="Create risk model">
          <input type="hidden" name="intent" value="createRiskModel" />
          <HiddenIdempotency />
          <label>
            Model key
            <input name="modelKey" defaultValue="COSO-ERM" required />
          </label>
          <label>
            Version
            <input name="modelVersion" defaultValue="v1" required />
          </label>
          <button type="submit">Create risk model</button>
        </form>

        <form className="miniForm" action={enterpriseActionPath} method="post" aria-label="Register risk">
          <input type="hidden" name="intent" value="createRisk" />
          <HiddenIdempotency />
          <label>
            Risk key
            <input name="riskKey" defaultValue="R-ACC-01" required />
          </label>
          <label>
            Inherent score (0-100)
            <input name="inherentScore" type="number" defaultValue="75" required />
          </label>
          <label>
            Title
            <input name="title" defaultValue="Unauthorized data access" required />
          </label>
          <button type="submit">Register risk</button>
        </form>
      </div>

      <div className="detailGrid">
        <SummaryCard label="Risk models" value={models.length} detail={models[0]?.modelKey ? `Latest: ${models[0].modelKey} (${models[0].modelVersion})` : "No models"} />
        <SummaryCard label="Top risk" value={risks[0]?.riskKey ?? "None"} detail={risks[0] ? `Score: ${risks[0].inherentScore} | ${risks[0].title}` : "No risks"} />
      </div>

      {risks.length > 0 ? (
        <div className="tableScroller" style={{ marginTop: "16px" }}>
          <table>
            <caption>Risk Register</caption>
            <thead>
              <tr>
                <th scope="col">Risk Key</th>
                <th scope="col">Title</th>
                <th scope="col">Inherent Score</th>
                <th scope="col">Status</th>
              </tr>
            </thead>
            <tbody>
              {risks.map((risk) => (
                <tr key={risk.id}>
                  <td><strong>{risk.riskKey}</strong></td>
                  <td>{risk.title}</td>
                  <td>
                    <span className={`badge ${risk.inherentScore > 70 ? "restricted" : "internal"}`}>
                      {risk.inherentScore}
                    </span>
                  </td>
                  <td><span className="badge internal">{risk.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
