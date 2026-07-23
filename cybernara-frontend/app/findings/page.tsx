import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type {
  Assessment,
  AssessmentItem,
  AssessmentQuestionOption,
  EvidenceObject,
  Finding,
  FindingAssistRequest
} from "../../src/lib/api/generated";
import { firstValue, formatDateTime, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";
import { FindingAiAssistForm } from "./finding-ai-assist-form";

type FindingsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const findingsActionPath = "/findings/actions";

export default async function FindingsPage({ searchParams }: FindingsPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = `/findings${serializeSearchParams(params)}`;
  const session = await requireSession(nextPath);
  const api = createServerApiClient(session);
  let assessments: Assessment[] = [];
  let assessment: Assessment | null = null;
  let item: AssessmentItem | null = null;
  let questionOptions: AssessmentQuestionOption[] = [];
  let selectedQuestion: AssessmentQuestionOption | null = null;
  let evidenceObjects: EvidenceObject[] = [];
  let allFindings: Finding[] = [];
  let findingsByItem = new Map<string, Finding[]>();
  let findings: Finding[] = [];
  let selectedFinding: Finding | null = null;
  let apiError: string | null = null;

  try {
    [assessments, questionOptions, evidenceObjects, allFindings] = await Promise.all([
      api.listAssessments({ limit: 100, offset: 0 }),
      api.listAssessmentQuestionOptions({ limit: 100, offset: 0 }),
      api.listEvidenceObjects({ limit: 100, offset: 0 }),
      api.listRiskFindings({ limit: 100, offset: 0 })
    ]);
    findings = allFindings;

    const assessmentId = textParam(params, "assessmentId");
    if (assessmentId) {
      assessment = await api.getAssessment(assessmentId);
      const itemId = textParam(params, "itemId") || assessment.items[0]?.id;
      item = assessment.items.find((candidate) => candidate.id === itemId) ?? assessment.items[0] ?? null;
      const assessmentItemIds = new Set(assessment.items.map((candidate) => candidate.id));
      const itemFindings = assessment.items.map((candidate) => [
        candidate.id,
        allFindings.filter((finding) => finding.assessmentItemId === candidate.id)
      ] as const);
      findingsByItem = new Map(itemFindings);
      findings = allFindings.filter((finding) =>
        finding.assessmentItemId ? assessmentItemIds.has(finding.assessmentItemId) : false
      );
      const findingId = textParam(params, "findingId");
      selectedFinding = findingId ? findings.find((candidate) => candidate.id === findingId) ?? null : null;
      if (selectedFinding?.assessmentItemId) {
        item = assessment.items.find((candidate) => candidate.id === selectedFinding?.assessmentItemId) ?? item;
      }
      selectedQuestion = item?.controlRef.questionVersionId
        ? questionOptions.find((option) => option.questionVersionId === item?.controlRef.questionVersionId) ?? null
        : null;
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Findings">
      {apiError ? <ErrorState title="Findings workspace could not be loaded" detail={apiError} /> : null}
      {!apiError ? (
        <>
          <FindingsDashboard
            assessments={assessments}
            selectedAssessment={assessment}
            findings={findings}
            allFindings={allFindings}
          />
          {assessment && item ? (
            <>
              <AssessmentItemExplorer
                assessment={assessment}
                selectedItem={item}
                questionOptions={questionOptions}
                findingsByItem={findingsByItem}
              />
              <FindingContext
                item={item}
                question={selectedQuestion}
                evidenceObjects={evidenceObjects}
              />
              <FindingManagement
                assessment={assessment}
                item={item}
                question={selectedQuestion}
                finding={selectedFinding}
                findings={findings}
                currentUserId={session.userId}
              />
            </>
          ) : (
            <EmptyState
              title="No approved assessment selected"
              detail="Findings are opened from approved assessments. Approve the assessment first, then use its Findings action."
              action={<Link href="/assessments/review">Open assessment review</Link>}
            />
          )}
        </>
      ) : null}
    </AppShell>
  );
}

function FindingsDashboard({
  assessments,
  selectedAssessment,
  findings,
  allFindings
}: {
  assessments: Assessment[];
  selectedAssessment: Assessment | null;
  findings: Finding[];
  allFindings: Finding[];
}) {
  const approvedAssessments = assessments.filter((entry) => entry.status === "approved");
  const dashboardFindings = selectedAssessment ? findings : allFindings;
  return (
    <section className="workspace" aria-labelledby="findings-dashboard-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Findings</p>
          <h2 id="findings-dashboard-heading">Approved assessment gap register</h2>
        </div>
        <span>{dashboardFindings.length} findings</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Selected assessment</span>
          <strong>{selectedAssessment?.scopeName ?? "None selected"}</strong>
          <small>{selectedAssessment ? selectedAssessment.status : "Open an approved assessment to record findings."}</small>
        </article>
        <article>
          <span className="label">Approved assessments</span>
          <strong>{approvedAssessments.length}</strong>
          <small>{approvedAssessments[0]?.scopeName ?? "No approved assessments yet"}</small>
        </article>
        <article>
          <span className="label">Finding purpose</span>
          <p>Use findings only when a reviewed control has a real gap, missing evidence, failed test, or remediation need.</p>
        </article>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Approved assessments</caption>
          <thead>
            <tr>
              <th scope="col">Assessment</th>
              <th scope="col">Frameworks</th>
              <th scope="col">Period</th>
              <th scope="col">Items</th>
              <th scope="col">Findings</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {approvedAssessments.length === 0 ? (
              <tr>
                <td colSpan={6}>No approved assessments are ready for findings.</td>
              </tr>
            ) : (
              approvedAssessments.map((assessment) => {
                const assessmentItemIds = new Set(assessment.items.map((item) => item.id));
                const assessmentFindings = allFindings.filter((finding) =>
                  finding.assessmentItemId ? assessmentItemIds.has(finding.assessmentItemId) : false
                );
                return (
                  <tr key={assessment.id}>
                    <td>{assessment.scopeName}</td>
                    <td>{assessmentFrameworks(assessment).join(", ") || "Pending"}</td>
                    <td>{formatDateTime(assessment.periodStart)} to {formatDateTime(assessment.periodEnd)}</td>
                    <td>{assessment.items.length}</td>
                    <td>{assessmentFindings.length}</td>
                    <td><Link href={`/findings?assessmentId=${assessment.id}`}>Open findings</Link></td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
      <DashboardFindingTable findings={dashboardFindings} assessments={assessments} />
    </section>
  );
}

function DashboardFindingTable({
  findings,
  assessments
}: {
  findings: Finding[];
  assessments: Assessment[];
}) {
  return (
    <div className="tableScroller">
      <table>
        <caption>{findings.length > 0 ? "Existing findings" : "No findings created yet"}</caption>
        <thead>
          <tr>
            <th scope="col">Assessment</th>
            <th scope="col">Control</th>
            <th scope="col">Severity</th>
            <th scope="col">Impact</th>
            <th scope="col">Likelihood</th>
            <th scope="col">Due date</th>
            <th scope="col">Description</th>
            <th scope="col">Updated</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {findings.length === 0 ? (
            <tr>
              <td colSpan={9}>No findings have been created yet.</td>
            </tr>
          ) : findings.map((finding) => {
            const target = findingTarget(assessments, finding);
            return (
              <tr key={finding.id}>
                <td>{target.assessment?.scopeName ?? "Assessment unavailable"}</td>
                <td>{target.item?.controlRef.controlId ?? "Control unavailable"}</td>
                <td><span className="badge confidential">{finding.severity}</span></td>
                <td>{finding.impact ?? "Not set"}</td>
                <td>{finding.likelihood ?? "Not set"}</td>
                <td>{finding.dueAt ? formatDateTime(finding.dueAt) : "Not set"}</td>
                <td>{finding.description}</td>
                <td>{formatDateTime(finding.updatedAt)}</td>
                <td>
                  <div className="tagList compactTagList">
                    {target.assessment && target.item ? (
                      <Link
                        className="reviewLink"
                        href={`/findings?assessmentId=${target.assessment.id}&itemId=${target.item.id}&findingId=${finding.id}`}
                      >
                        Edit finding
                      </Link>
                    ) : null}
                    <Link className="reviewLink" href={`/risks?findingId=${finding.id}`}>
                      Risk plan
                    </Link>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AssessmentItemExplorer({
  assessment,
  selectedItem,
  questionOptions,
  findingsByItem
}: {
  assessment: Assessment;
  selectedItem: AssessmentItem;
  questionOptions: AssessmentQuestionOption[];
  findingsByItem: Map<string, Finding[]>;
}) {
  return (
    <section className="workspace" aria-labelledby="findings-items-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Assessment details</p>
          <h2 id="findings-items-heading">{assessment.scopeName}</h2>
        </div>
        <span>{assessment.status}</span>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Assessment items</caption>
          <thead>
            <tr>
              <th scope="col">Control</th>
              <th scope="col">Question</th>
              <th scope="col">Type</th>
              <th scope="col">Answer</th>
              <th scope="col">Evidence</th>
              <th scope="col">Findings</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {assessment.items.map((item) => {
              const question = questionOptions.find((option) => option.questionVersionId === item.controlRef.questionVersionId) ?? null;
              return (
                <tr key={item.id}>
                  <td>{item.controlRef.controlId}</td>
                  <td>{question?.questionText ?? "Question catalog entry unavailable"}</td>
                  <td>{question ? responseTypeLabel(question.responseType) : "Unknown"}</td>
                  <td>{item.answerText ? "Submitted" : "No answer"}</td>
                  <td>{item.evidenceIds.length} file{item.evidenceIds.length === 1 ? "" : "s"}</td>
                  <td>{findingsByItem.get(item.id)?.length ?? 0}</td>
                  <td>
                    <Link href={`/findings?assessmentId=${assessment.id}&itemId=${item.id}`}>
                      {selectedItem.id === item.id ? "Selected" : "Inspect"}
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function FindingContext({
  item,
  question,
  evidenceObjects
}: {
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  evidenceObjects: EvidenceObject[];
}) {
  const frameworks = frameworkLabelsFromQuestion(question, item);
  const evidence = question?.evidenceExpectationIds ?? [];
  const citations = question?.citations ?? [];
  const submittedEvidence = evidenceObjects.filter((candidate) => item.evidenceIds.includes(candidate.id));
  return (
    <section className="workspace" aria-labelledby="finding-context-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Finding context</p>
          <h2 id="finding-context-heading">{item.controlRef.controlId}</h2>
        </div>
        <span>{item.status}</span>
      </div>
      <div className="ownerQuestionPanel" aria-label="Assessment item context for finding">
        <article className="ownerQuestionHero">
          <div>
            <span className="label">Question</span>
            <h3>{question?.questionText ?? "Question catalog entry unavailable"}</h3>
          </div>
          <span className="badge internal">{question ? responseTypeLabel(question.responseType) : "Question"}</span>
        </article>
        <div className="ownerQuestionCards">
          <article>
            <span className="label">Frameworks</span>
            <div className="tagList compactTagList">
              {frameworks.length > 0 ? frameworks.map((framework) => <span key={framework}>{framework}</span>) : <span>Framework pending</span>}
            </div>
          </article>
          <article>
            <span className="label">Question type</span>
            <strong>{question ? responseTypeLabel(question.responseType) : "Unknown"}</strong>
          </article>
          <article>
            <span className="label">Harmonized control</span>
            <strong>{question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? "Unknown"}</strong>
            <small>{question?.harmonizedControlName ?? "Control context unavailable"}</small>
          </article>
          <article>
            <span className="label">Source control</span>
            <strong>{question?.controlId ?? item.controlRef.controlId ?? "Unknown"}</strong>
            <small>{question?.controlTitle ?? "Mapped source control"}</small>
          </article>
          <article className="wideArticle">
            <span className="label">Answer</span>
            <p>{item.answerText ?? "No answer submitted yet."}</p>
          </article>
          <article>
            <span className="label">Evidence required</span>
            <strong>{evidence.length}</strong>
            <small>{evidence.join(", ") || "No expected evidence declared."}</small>
          </article>
          <article>
            <span className="label">AI provenance</span>
            <strong>{questionOriginLabel(question)}</strong>
            <small>
              {question?.generationRunId
                ? `Generation run ${question.generationRunId}. Prompt ${question.promptVersionId ?? "unknown"} | Model ${question.modelDeploymentId ?? "unknown"}.`
                : "Not AI-generated. No prompt/model lineage stored on this catalog entry."}
            </small>
          </article>
          <article>
            <span className="label">Review and confidence</span>
            <strong>{question ? `${Math.round(question.confidence * 100)}% confidence` : "No confidence score"}</strong>
            <small>{question?.approvedAt ? `Approved ${formatDateTime(question.approvedAt)}` : "Not approved in visible catalog metadata."}</small>
          </article>
          <article>
            <span className="label">Classification</span>
            <strong>{question?.classification ?? "confidential"}</strong>
            <small>Updated {question?.updatedAt ? formatDateTime(question.updatedAt) : "not recorded"}</small>
          </article>
          <article className="wideArticle">
            <span className="label">Citations</span>
            <strong>{citations.length}</strong>
            <div className="tagList">
              {citations.slice(0, 14).map((citation, index) => (
                <span key={`${citationLabel(citation)}-${index}`}>{citationLabel(citation)}</span>
              ))}
              {citations.length > 14 ? <span>+{citations.length - 14} more</span> : null}
            </div>
          </article>
        </div>
      </div>
      <EvidenceTable evidenceObjects={submittedEvidence} />
    </section>
  );
}

function EvidenceTable({ evidenceObjects }: { evidenceObjects: EvidenceObject[] }) {
  if (evidenceObjects.length === 0) {
    return <EmptyState title="No submitted evidence" detail="This assessment item has no evidence attached to the submitted answer." />;
  }
  return (
    <div className="tableScroller">
      <table>
        <caption>Evidence submitted with this answer</caption>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">State</th>
            <th scope="col">Scope tags</th>
            <th scope="col">Hash</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {evidenceObjects.map((evidence) => (
            <tr key={evidence.id}>
              <td>{evidence.fileName}</td>
              <td><span className={`badge ${evidence.state === "committed" ? "internal" : "confidential"}`}>{evidence.state}</span></td>
              <td>{evidence.scopeTags.join(", ") || "No scope tags"}</td>
              <td><code>{evidence.sha256?.slice(0, 24) ?? "pending scan"}</code></td>
              <td>
                {evidence.state === "committed" ? (
                  <a href={`/api/backend/v1/evidence/objects/${evidence.id}/download`} target="_blank" rel="noreferrer">
                    View file
                  </a>
                ) : (
                  "Unavailable until committed"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FindingManagement({
  assessment,
  item,
  question,
  finding,
  findings,
  currentUserId
}: {
  assessment: Assessment;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  finding: Finding | null;
  findings: Finding[];
  currentUserId: string;
}) {
  const canCreateFinding = assessment.status === "approved" && !finding;
  const assistContext = findingAssistContext(item, question);
  return (
    <section className="workspace" aria-labelledby="finding-management-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Finding register</p>
          <h2 id="finding-management-heading">Control gaps and remediation context</h2>
        </div>
        <div className="tagList compactTagList">
          <span>{findings.length} findings</span>
          {finding ? (
            <Link className="reviewLink" href={`/findings?assessmentId=${assessment.id}&itemId=${item.id}`}>
              New finding
            </Link>
          ) : null}
        </div>
      </div>
      <FindingTable findings={findings} assessment={assessment} item={item} selectedFinding={finding} />
      <div className="workflowGrid">
        {finding ? (
          <FindingAiAssistForm
            title="Update selected finding"
            intent="updateFinding"
            actionPath={findingsActionPath}
            assessmentId={assessment.id}
            itemId={item.id}
            ownerId={currentUserId}
            context={assistContext}
            finding={finding}
          />
        ) : canCreateFinding ? (
          <FindingAiAssistForm
            title="Create finding"
            intent="createFinding"
            actionPath={findingsActionPath}
            assessmentId={assessment.id}
            itemId={item.id}
            ownerId={currentUserId}
            context={assistContext}
          />
        ) : (
          <div className="constraintNote">
            New findings can be recorded only while the assessment is approved. Closed assessments are archived for audit history.
          </div>
        )}
      </div>
    </section>
  );
}

function FindingTable({
  findings,
  assessment,
  item,
  selectedFinding
}: {
  findings: Finding[];
  assessment: Assessment;
  item: AssessmentItem;
  selectedFinding: Finding | null;
}) {
  if (findings.length === 0) {
    return <EmptyState title="No findings yet" detail="Create a finding only if this approved assessment reveals a real gap." />;
  }
  return (
    <div className="tableScroller">
      <table>
        <caption>Assessment findings</caption>
        <thead>
          <tr>
            <th scope="col">Severity</th>
            <th scope="col">Impact</th>
            <th scope="col">Likelihood</th>
            <th scope="col">Due date</th>
            <th scope="col">Description</th>
            <th scope="col">Updated</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {findings.map((finding) => (
            <tr key={finding.id}>
              <td><span className="badge confidential">{finding.severity}</span></td>
              <td>{finding.impact ?? "Not set"}</td>
              <td>{finding.likelihood ?? "Not set"}</td>
              <td>{finding.dueAt ? formatDateTime(finding.dueAt) : "Not set"}</td>
              <td>{finding.description}</td>
              <td>{formatDateTime(finding.updatedAt)}</td>
              <td>
                <Link
                  className="reviewLink"
                  href={`/findings?assessmentId=${assessment.id}&itemId=${finding.assessmentItemId ?? item.id}&findingId=${finding.id}`}
                >
                  {selectedFinding?.id === finding.id ? "Editing" : "Edit finding"}
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function assessmentFrameworks(assessment: Assessment): string[] {
  return [...new Set(assessment.items.map((entry) => entry.controlRef.frameworkKey).filter((value): value is string => Boolean(value)))].sort();
}

function findingTarget(
  assessments: Assessment[],
  finding: Finding
): { assessment: Assessment | null; item: AssessmentItem | null } {
  if (!finding.assessmentItemId) {
    return { assessment: null, item: null };
  }
  for (const assessment of assessments) {
    const item = assessment.items.find((candidate) => candidate.id === finding.assessmentItemId) ?? null;
    if (item) {
      return { assessment, item };
    }
  }
  return { assessment: null, item: null };
}

function frameworkLabelsFromQuestion(question: AssessmentQuestionOption | null, item: AssessmentItem): string[] {
  if (question) {
    return frameworkLabels(question);
  }
  return [...new Set([item.controlRef.frameworkKey ?? "", item.controlRef.controlId ?? ""].filter(Boolean))].sort();
}

function frameworkLabels(option: AssessmentQuestionOption): string[] {
  const fromOption = Array.isArray(option.frameworkKeys) ? option.frameworkKeys : [];
  const fromCitations = option.citations
    .map((citation) => typeof citation.sourceId === "string" && citation.sourceId.includes(":") ? citation.sourceId.split(":")[0] : "")
    .filter(Boolean);
  return [...new Set([...fromOption, ...fromCitations, option.frameworkKey])].sort();
}

function citationLabel(citation: AssessmentQuestionOption["citations"][number]): string {
  return typeof citation.sourceId === "string" && citation.sourceId.trim() ? citation.sourceId : "citation";
}

function citationSourceType(citation: AssessmentQuestionOption["citations"][number]): string | undefined {
  return typeof citation.sourceType === "string" && citation.sourceType.trim() ? citation.sourceType : undefined;
}

function findingAssistContext(item: AssessmentItem, question: AssessmentQuestionOption | null): FindingAssistRequest {
  const frameworks = frameworkLabelsFromQuestion(question, item);
  return {
    assessmentItemId: item.id,
    questionText: question?.questionText ?? item.controlRef.controlId ?? "Assessment item",
    responseType: question?.responseType,
    answerText: item.answerText ?? "",
    frameworkKeys: frameworks,
    harmonizedControlId: question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? undefined,
    harmonizedControlName: question?.harmonizedControlName ?? undefined,
    sourceControlId: question?.controlId ?? item.controlRef.controlId ?? undefined,
    sourceControlTitle: question?.controlTitle ?? undefined,
    evidenceExpectationIds: question?.evidenceExpectationIds ?? [],
    citations: (question?.citations ?? []).map((citation) => ({
      sourceId: citationLabel(citation),
      sourceType: citationSourceType(citation)
    })),
    evidenceObjectIds: item.evidenceIds
  };
}

function responseTypeLabel(value: AssessmentQuestionOption["responseType"]): string {
  return value === "multi_select" ? "Multi-select" : value[0].toUpperCase() + value.slice(1);
}

function questionOriginLabel(question: AssessmentQuestionOption | null): string {
  if (!question) {
    return "Pinned catalog question";
  }
  if (question.sourceType === "ai_generated" || question.sourceAiQuestionVersionId) {
    return "AI Generated";
  }
  if (question.sourceType === "curated") {
    return "Manually Curated";
  }
  return question.sourceType;
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
