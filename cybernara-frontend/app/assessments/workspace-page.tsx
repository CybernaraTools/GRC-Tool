import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import { AnswerEvidenceControls } from "./answer-evidence-controls";
import { EvidenceUploadPanel } from "./evidence-upload-panel";
import type {
  AnswerRevision,
  ApplicabilityDecision,
  Assessment,
  AssessmentItem,
  AssessmentQuestionOption,
  EvidenceUploadPolicy,
  AssessmentSignoff,
  EvidenceObject,
  EvidenceScanStatus,
  EvidenceVersion,
  Finding,
  ManualControlTestResult,
  RemediationTask,
  ReportExport,
  ReviewDecision,
  TestProcedure
} from "../../src/lib/api/generated";
import { formatDateTime, firstValue, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";

type AssessmentsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const assessmentActionPath = "/assessments/actions";
type AssessmentWorkspaceMode = "owner" | "review";
const showExtendedReviewWorkflows = false;

export async function AssessmentWorkspacePage({
  searchParams,
  mode
}: AssessmentsPageProps & { mode: AssessmentWorkspaceMode }) {
  const params = searchParams ? await searchParams : {};
  const basePath = mode === "review" ? "/assessments/review" : "/assessments";
  const nextPath = `${basePath}${serializeSearchParams(params)}`;
  const session = await requireSession(nextPath);
  const api = createServerApiClient(session);
  let assessments: Assessment[] = [];
  let assessment: Assessment | null = null;
  let item: AssessmentItem | null = null;
  let evidenceObjects: EvidenceObject[] = [];
  let evidenceUploadPolicy: EvidenceUploadPolicy | null = null;
  let selectedEvidence: EvidenceObject | null = null;
  let selectedEvidenceScanStatus: EvidenceScanStatus | null = null;
  let selectedEvidenceVersions: EvidenceVersion[] = [];
  let findings: Finding[] = [];
  let selectedFinding: Finding | null = null;
  let tasks: RemediationTask[] = [];
  let selectedTask: RemediationTask | null = null;
  let reportExports: ReportExport[] = [];
  let selectedExport: ReportExport | null = null;
  let answerHistory: AnswerRevision[] = [];
  let applicabilityHistory: ApplicabilityDecision[] = [];
  let reviewHistory: ReviewDecision[] = [];
  let signoffs: AssessmentSignoff[] = [];
  let testProcedures: TestProcedure[] = [];
  let testResults: ManualControlTestResult[] = [];
  let questionOptions: AssessmentQuestionOption[] = [];
  let selectedQuestion: AssessmentQuestionOption | null = null;
  let editingAssessment: Assessment | null = null;
  let apiError: string | null = null;

  try {
    [assessments, questionOptions] = await Promise.all([
      api.listAssessments({ limit: 100, offset: 0 }),
      api.listAssessmentQuestionOptions({ limit: 100, offset: 0 })
    ]);
    const editAssessmentId = mode === "owner" ? textParam(params, "editAssessmentId") : "";
    if (editAssessmentId) {
      editingAssessment = assessments.find((candidate) => candidate.id === editAssessmentId) ?? await api.getAssessment(editAssessmentId);
    }
    const assessmentId = textParam(params, "assessmentId");
    if (assessmentId) {
      assessment = await api.getAssessment(assessmentId);
      const itemId = textParam(params, "itemId") || assessment.items[0]?.id;
      item = assessment.items.find((candidate) => candidate.id === itemId) ?? assessment.items[0] ?? null;
      selectedQuestion = item?.controlRef.questionVersionId
        ? questionOptions.find((option) => option.questionVersionId === item?.controlRef.questionVersionId) ?? null
        : null;
      [evidenceObjects, reportExports, signoffs, evidenceUploadPolicy] = await Promise.all([
        api.listEvidenceObjects({ limit: 50, offset: 0 }),
        mode === "review" ? api.listReportExports({ assessmentId: assessment.id, limit: 10, offset: 0 }) : Promise.resolve([]),
        mode === "review" ? api.listAssessmentSignoffs(assessment.id) : Promise.resolve([]),
        api.getEvidenceUploadPolicy()
      ]);
      const evidenceId = textParam(params, "evidenceId");
      selectedEvidence = evidenceId ? evidenceObjects.find((candidate) => candidate.id === evidenceId) ?? null : null;
      if (selectedEvidence) {
        [selectedEvidenceScanStatus, selectedEvidenceVersions] = await Promise.all([
          api.getEvidenceScanStatus(selectedEvidence.id),
          api.listEvidenceVersions(selectedEvidence.id, { limit: 3, offset: 0 })
        ]);
      }
      if (item) {
        [findings, answerHistory, applicabilityHistory, reviewHistory, testProcedures, testResults] = mode === "review"
          ? await Promise.all([
              api.listRiskFindings({ assessmentItemId: item.id, limit: 10, offset: 0 }),
              api.listAssessmentAnswerHistory(assessment.id, item.id),
              api.listAssessmentApplicabilityHistory(assessment.id, item.id),
              api.listAssessmentReviewHistory(assessment.id, item.id),
              api.listAssessmentTestProcedures(assessment.id, item.id),
              api.listAssessmentControlTestResults(assessment.id, item.id)
            ])
          : await Promise.all([
              Promise.resolve([]),
              api.listAssessmentAnswerHistory(assessment.id, item.id),
              Promise.resolve([]),
              Promise.resolve([]),
              Promise.resolve([]),
              Promise.resolve([])
            ]);
        const findingId = textParam(params, "findingId") || findings[0]?.id;
        selectedFinding = findingId ? findings.find((candidate) => candidate.id === findingId) ?? null : null;
        if (selectedFinding) {
          tasks = await api.listRemediationTasks({ findingId: selectedFinding.id, limit: 10, offset: 0 });
          const taskId = textParam(params, "taskId") || tasks[0]?.id;
          selectedTask = taskId ? tasks.find((candidate) => candidate.id === taskId) ?? null : null;
        }
      }
      if (mode === "review") {
        const exportId = textParam(params, "exportId") || reportExports[0]?.id;
        selectedExport = exportId ? reportExports.find((candidate) => candidate.id === exportId) ?? null : null;
      }
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title={mode === "review" ? "Assessment Review" : "Assessment Workspace"}>
      {!apiError ? (
        <AssessmentDashboard
          assessments={assessments}
          params={params}
          currentUserId={session.userId}
          mode={mode}
        />
      ) : null}

      {mode === "owner" ? (
        <section className="workspace" aria-labelledby="assessment-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Assessment core</p>
              <h2 id="assessment-heading">{editingAssessment ? "Edit draft assessment" : "Create assessment scope"}</h2>
            </div>
            <span>{editingAssessment ? "Draft edit" : assessment ? assessment.status : "Create a scope"}</span>
          </div>
          {apiError ? <ErrorState title="Assessment workspace could not be loaded" detail={apiError} /> : null}
          {!apiError ? (
            <CreateAssessmentForm
              ownerId={session.userId}
              questionOptions={questionOptions}
              canCreate={canCreateAssessment(session)}
              editingAssessment={editingAssessment}
            />
          ) : null}
        </section>
      ) : (
        <section className="workspace" aria-labelledby="assessment-review-heading">
          <div className="sectionHeader">
            <div>
              <p className="eyebrow">Reviewer workspace</p>
              <h2 id="assessment-review-heading">Assessment review and approval</h2>
            </div>
            <span>{assessment ? assessment.status : "Select an assessment"}</span>
          </div>
          {apiError ? <ErrorState title="Assessment review could not be loaded" detail={apiError} /> : null}
          {!apiError && !assessment ? (
            <EmptyState title="Select an assessment to review" detail="Use the dashboard review links to inspect submitted answers, evidence, findings, test results, sign-offs, and report exports." />
          ) : null}
        </section>
      )}

      {!apiError && assessment ? (
        <>
          <AssessmentSummary assessment={assessment} assessments={assessments} />
          {item ? (
            <ItemWorkflow
              assessment={assessment}
              item={item}
              question={selectedQuestion}
              selectedEvidence={selectedEvidence?.state === "committed" ? selectedEvidence : null}
              evidenceObjects={evidenceObjects}
              mode={mode}
            />
          ) : (
            <EmptyState title="No assessment items" detail="The selected assessment has no pinned controls." />
          )}
          <EvidenceWorkflow
            assessment={assessment}
            item={item}
            question={selectedQuestion}
            evidenceObjects={evidenceObjects}
            selectedEvidence={selectedEvidence}
            selectedEvidenceScanStatus={selectedEvidenceScanStatus}
            selectedEvidenceVersions={selectedEvidenceVersions}
            uploadPolicy={evidenceUploadPolicy}
            ownerId={session.userId}
            reuseResult={textParam(params, "reuse")}
            mode={mode}
          />
          {showExtendedReviewWorkflows && mode === "review" && item ? (
            <RiskWorkflow assessment={assessment} item={item} findings={findings} selectedFinding={selectedFinding} tasks={tasks} selectedTask={selectedTask} ownerId={session.userId} />
          ) : null}
          {showExtendedReviewWorkflows && mode === "review" && item ? (
            <ExecutionHistory
              answerHistory={answerHistory}
              applicabilityHistory={applicabilityHistory}
              reviewHistory={reviewHistory}
            />
          ) : null}
          {showExtendedReviewWorkflows && mode === "review" && item ? (
            <TestProcedureWorkflow
              assessment={assessment}
              item={item}
              testProcedures={testProcedures}
              testResults={testResults}
            />
          ) : null}
          {showExtendedReviewWorkflows && mode === "review" ? <SignoffSummary assessment={assessment} signoffs={signoffs} /> : null}
          {showExtendedReviewWorkflows && mode === "review" ? <ReportWorkflow assessment={assessment} exports={reportExports} selectedExport={selectedExport} /> : null}
        </>
      ) : null}
    </AppShell>
  );
}

function AssessmentDashboard({
  assessments,
  params,
  currentUserId,
  mode
}: {
  assessments: Assessment[];
  params: SearchParamsRecord;
  currentUserId: string;
  mode: AssessmentWorkspaceMode;
}) {
  const filters = {
    framework: textParam(params, "framework"),
    status: textParam(params, "status"),
    search: textParam(params, "search").toLowerCase()
  };
  const filteredAssessments = assessments.filter((entry) => assessmentMatchesFilters(entry, filters));
  const grouped = groupAssessmentsByWorkspaceStatus(filteredAssessments);
  const overdue = filteredAssessments.filter((entry) => new Date(entry.periodEnd).getTime() < Date.now() && !["approved", "closed"].includes(entry.status));
  const assignedToMe = filteredAssessments.filter((entry) => entry.items.some((candidate) => candidate.ownerId === currentUserId));
  const recentlyUpdated = [...filteredAssessments].sort((left, right) => Date.parse(right.updatedAt ?? right.createdAt ?? right.periodEnd) - Date.parse(left.updatedAt ?? left.createdAt ?? left.periodEnd)).slice(0, 5);
  const basePath = mode === "review" ? "/assessments/review" : "/assessments";

  return (
    <section className="workspace" aria-labelledby="assessment-dashboard-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Assessment dashboard</p>
          <h2 id="assessment-dashboard-heading">Workspace overview</h2>
        </div>
        <span>{filteredAssessments.length} shown</span>
      </div>
      <form className="filterForm" action={basePath} method="get" aria-label="Filter assessments">
        <label>
          Framework
          <input name="framework" defaultValue={filters.framework} placeholder="SOC2, ISO_27001" />
        </label>
        <label>
          Status
          <select name="status" defaultValue={filters.status}>
            <option value="">All statuses</option>
            <option value="not_started">Draft / not started</option>
            <option value="in_progress">In progress</option>
            <option value="submitted">Pending review</option>
            <option value="needs_changes">Needs changes</option>
            <option value="approved">Approved</option>
            <option value="closed">Closed</option>
          </select>
        </label>
        <label>
          Search
          <input name="search" defaultValue={filters.search} placeholder="Assessment name or control" />
        </label>
        <div className="formActions">
          <button type="submit">Apply filters</button>
          <Link href={basePath} className="secondary">Reset</Link>
        </div>
      </form>
      <div className="detailGrid">
        <DashboardMetric label="Recent assessments" value={filteredAssessments.length} detail={filteredAssessments[0]?.scopeName ?? "No assessments yet"} />
        <DashboardMetric label="Continue working" value={grouped.inProgress.length} detail={grouped.inProgress[0]?.scopeName ?? "Nothing in progress"} />
        <DashboardMetric label="Pending approvals" value={grouped.pendingReview.length} detail={grouped.pendingReview[0]?.scopeName ?? "No submitted items"} />
        <DashboardMetric label="Overdue" value={overdue.length} detail={overdue[0]?.scopeName ?? "No overdue assessments"} />
        <DashboardMetric label="Completed" value={grouped.approved.length + grouped.closed.length} detail={grouped.closed[0]?.scopeName ?? grouped.approved[0]?.scopeName ?? "No completed assessments"} />
        <DashboardMetric label="Assigned to me" value={assignedToMe.length} detail={assignedToMe[0]?.scopeName ?? "No assigned assessment items"} />
      </div>
      {mode === "owner" ? (
        <div className="constraintNote">
          This page is the control-owner workspace: create assessments, answer assigned controls, upload evidence, and monitor quarantine/scan status.
          Submitted answers and attached evidence are reviewed in <Link href="/assessments/review">Assessment Review</Link>.
        </div>
      ) : (
        <div className="constraintNote">
          This page is the reviewer workspace: inspect submitted answers and evidence, approve the item, or request changes from the control owner.
          Control owners answer questions and upload evidence in <Link href="/assessments">Assessment Workspace</Link>.
        </div>
      )}
      <AssessmentCardGroup title="Draft" detail="Not started" assessments={grouped.draft} mode={mode} />
      <AssessmentCardGroup title="In Progress" detail="Work has started" assessments={grouped.inProgress} mode={mode} />
      <AssessmentCardGroup title="Pending Review" detail="Waiting for reviewer" assessments={grouped.pendingReview} mode={mode} />
      <AssessmentCardGroup title="Approved" detail="Completed" assessments={grouped.approved} mode={mode} />
      <AssessmentCardGroup title="Closed" detail="Archived" assessments={grouped.closed} mode={mode} />
      <AssessmentCardGroup title="Recently Updated" detail="Most recent activity" assessments={recentlyUpdated} mode={mode} />
    </section>
  );
}

function DashboardMetric({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <article>
      <span className="label">{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </article>
  );
}

function AssessmentCardGroup({ title, detail, assessments, mode }: { title: string; detail: string; assessments: Assessment[]; mode: AssessmentWorkspaceMode }) {
  return (
    <div className="tableScroller" aria-label={`${title} assessments`} tabIndex={0}>
      <table>
        <caption>{title} - {detail}</caption>
        <thead>
          <tr>
            <th scope="col">Assessment</th>
            <th scope="col">Framework</th>
            <th scope="col">Version</th>
            <th scope="col">Progress</th>
            <th scope="col">Due date</th>
            <th scope="col">Created</th>
            <th scope="col">Updated</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {assessments.length === 0 ? (
            <tr>
              <td colSpan={8}>No assessments in this group.</td>
            </tr>
          ) : (
            assessments.map((assessment) => {
              const progress = assessmentProgress(assessment);
              const firstItem = assessment.items[0] ?? null;
              const hasReviewableSubmission = assessmentHasReviewableSubmission(assessment);
              return (
                <tr key={assessment.id}>
                  <td>{assessment.scopeName}</td>
                  <td>{assessmentFrameworks(assessment).join(", ") || "Pending"}</td>
                  <td>{firstItem?.controlRef.frameworkVersion ?? assessment.controlSnapshotVersion}</td>
                  <td>{progress.approved}/{progress.total} approved</td>
                  <td>{formatDateTime(assessment.periodEnd)}</td>
                  <td>{assessment.createdAt ? formatDateTime(assessment.createdAt) : "Not recorded"}</td>
                  <td>{assessment.updatedAt ? formatDateTime(assessment.updatedAt) : "Not recorded"}</td>
                  <td>
                    <div className="formActions compactActions">
                      <Link href={`/assessments?assessmentId=${assessment.id}`}>Open</Link>
                      {mode === "owner" && assessment.status === "not_started" ? (
                        <Link href={`/assessments?editAssessmentId=${assessment.id}`}>Edit</Link>
                      ) : null}
                      {hasReviewableSubmission ? (
                        <Link href={`/assessments/review?assessmentId=${assessment.id}`}>
                          {mode === "review" ? "Review" : "Review page"}
                        </Link>
                      ) : null}
                      {assessment.status === "approved" ? (
                        <Link href={`/findings?assessmentId=${assessment.id}`}>Findings</Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

function CreateAssessmentForm({
  ownerId,
  questionOptions,
  canCreate,
  editingAssessment
}: {
  ownerId: string;
  questionOptions: AssessmentQuestionOption[];
  canCreate: boolean;
  editingAssessment: Assessment | null;
}) {
  if (!canCreate) {
    return (
      <div className="constraintNote">
        Assessment creation is available to Platform Admin and Compliance Manager roles. This session can review
        existing assessment content but cannot create new scopes.
      </div>
    );
  }

  if (questionOptions.length === 0) {
    return (
      <div className="constraintNote">
        No approved assessment questions are available yet. Enable a framework in the Framework Library to seed curated
        baseline questions before creating an assessment.
      </div>
    );
  }

  if (editingAssessment && editingAssessment.status !== "not_started") {
    return (
      <div className="constraintNote">
        This assessment has already started. Open it to continue answering, or create a new draft if the scope needs to change.
      </div>
    );
  }

  const groupedOptions = groupQuestionOptions(questionOptions);
  const selectedQuestionVersionId = editingAssessment?.items[0]?.controlRef.questionVersionId;
  const currentOption = selectedQuestionVersionId
    ? questionOptions.find((option) => option.questionVersionId === selectedQuestionVersionId)
    : null;
  const firstOption =
    currentOption ??
    questionOptions.find((option) => option.responseType === "text") ??
    groupedOptions[0]?.options[0] ??
    questionOptions[0];
  const typeSummary = questionTypeSummary(questionOptions);
  const isEditing = Boolean(editingAssessment);

  return (
    <form
      className="filterForm"
      action={assessmentActionPath}
      method="post"
      aria-label={isEditing ? "Edit draft assessment" : "Create assessment scope"}
    >
      <input type="hidden" name="intent" value={isEditing ? "updateAssessment" : "createAssessment"} />
      {editingAssessment ? <input type="hidden" name="assessmentId" value={editingAssessment.id} /> : null}
      <input type="hidden" name="ownerId" value={ownerId} />
      <HiddenIdempotency />
      <label>
        Scope name
        <input name="scopeName" defaultValue={editingAssessment?.scopeName ?? "FY26 readiness"} required />
      </label>
      <label>
        Period start
        <input
          name="periodStart"
          type="date"
          defaultValue={editingAssessment ? dateInputValue(editingAssessment.periodStart) : "2026-01-01"}
          required
        />
      </label>
      <label>
        Period end
        <input
          name="periodEnd"
          type="date"
          defaultValue={editingAssessment ? dateInputValue(editingAssessment.periodEnd) : "2026-12-31"}
          required
        />
      </label>
      <label>
        Approved question
        <select name="questionVersionId" required defaultValue={firstOption?.questionVersionId}>
          {groupedOptions.map((group) => (
            <optgroup key={group.harmonizedControlId} label={`${group.harmonizedControlId} - ${group.harmonizedControlName}`}>
              {group.options.map((option) => (
                <option key={option.questionVersionId} value={option.questionVersionId}>
                  {option.questionText} [{responseTypeLabel(option.responseType)} | {frameworkLabels(option).join(", ")}]
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
      <div className="questionTypeSummary" aria-label="Available assessment question response types">
        {typeSummary.map((entry) => (
          <span key={entry.responseType}>
            <strong>{entry.count}</strong>
            <small>{responseTypeLabel(entry.responseType)}</small>
          </span>
        ))}
      </div>
      <div className="questionOptionPreview" aria-label="Approved question selection context">
        {groupedOptions.slice(0, 6).map((group) => (
          <article key={group.harmonizedControlId}>
            <span className="label">{group.harmonizedControlId}</span>
            <strong>{group.harmonizedControlName}</strong>
            <small>{group.options.length} approved question{group.options.length === 1 ? "" : "s"}</small>
            <small>{questionTypeSummary(group.options).map((entry) => `${entry.count} ${responseTypeLabel(entry.responseType)}`).join(" / ")}</small>
            <div className="tagList">
              {frameworkLabels(group.options[0]).slice(0, 8).map((frameworkKey) => (
                <span key={frameworkKey}>{frameworkKey}</span>
              ))}
            </div>
          </article>
        ))}
      </div>
      <p className="constraintNote">
        Framework, mapping, harmonized control, and question version are resolved from the approved repository entry.
      </p>
      <div className="formActions">
        <button type="submit">{isEditing ? "Save draft assessment" : "Create assessment"}</button>
        {isEditing ? <Link href="/assessments" className="secondary">Cancel edit</Link> : null}
      </div>
    </form>
  );
}

function AssessmentSummary({ assessment, assessments }: { assessment: Assessment; assessments: Assessment[] }) {
  return (
    <section className="workspace" aria-labelledby="assessment-summary-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Selected assessment</p>
          <h2 id="assessment-summary-heading">{assessment.scopeName}</h2>
        </div>
        <span>{assessment.status}</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Snapshot</span>
          <code>{assessment.controlSnapshotVersion}</code>
        </article>
        <article>
          <span className="label">Period</span>
          <strong>
            {formatDateTime(assessment.periodStart)} to {formatDateTime(assessment.periodEnd)}
          </strong>
        </article>
        <article>
          <span className="label">Recent assessments</span>
          <strong>{assessments.length}</strong>
          <small>{assessments.map((entry) => entry.scopeName).join(", ")}</small>
        </article>
      </div>
    </section>
  );
}

function ItemWorkflow({
  assessment,
  item,
  question,
  selectedEvidence,
  evidenceObjects,
  mode
}: {
  assessment: Assessment;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  selectedEvidence: EvidenceObject | null;
  evidenceObjects: EvidenceObject[];
  mode: AssessmentWorkspaceMode;
}) {
  const returnToPath = mode === "review" ? "/assessments/review" : "/assessments";
  const context = <AssessmentHidden assessment={assessment} item={item} returnToPath={returnToPath} />;
  const committedEvidenceOptions = evidenceObjects.filter((candidate) => candidate.state === "committed");
  const selectedEvidenceIds = [
    ...item.evidenceIds,
    ...(selectedEvidence ? [selectedEvidence.id] : [])
  ].filter((id, index, values) => values.indexOf(id) === index);
  const canEditOwnerItem = canEditAssessmentItem(item);
  return (
    <section className="workspace" aria-labelledby="item-workflow-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{mode === "review" ? "Reviewer state machine" : "Control-owner workspace"}</p>
          <h2 id="item-workflow-heading">{item.controlRef.controlId}</h2>
        </div>
        <span>{item.status}</span>
      </div>
      {mode === "owner" ? (
        <ControlOwnerQuestionPanel question={question} item={item} />
      ) : (
        <ReviewerQuestionPanel question={question} item={item} />
      )}
      <div className="workflowGrid">
        {mode === "owner" && canEditOwnerItem ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Submit assessment answer">
            <input type="hidden" name="intent" value="submitAnswer" />
            {context}
            <HiddenIdempotency />
            {!item.applicability ? (
              <>
                <input type="hidden" name="autoApplicability" value="true" />
                <input type="hidden" name="applicable" value="true" />
                <input
                  type="hidden"
                  name="rationale"
                  value="Selected enabled framework, harmonized control, and approved question are in scope for this assessment."
                />
              </>
            ) : null}
            <QuestionAnswerInput question={question} currentAnswer={item.answerText} />
            <AnswerEvidenceControls
              evidenceOptions={committedEvidenceOptions.map((evidence) => ({
                id: evidence.id,
                fileName: evidence.fileName,
                scopeTags: evidence.scopeTags
              }))}
              defaultSelectedEvidenceIds={selectedEvidenceIds}
            />
          </form>
        ) : mode === "owner" ? (
          <div className="constraintNote">
            This answer has been submitted and is locked for review. A reviewer can approve it or reopen it if changes are needed.
          </div>
        ) : (
          <ReviewerActions assessment={assessment} item={item} />
        )}
      </div>
    </section>
  );
}

function ControlOwnerQuestionPanel({ question, item }: { question: AssessmentQuestionOption | null; item: AssessmentItem }) {
  const frameworks = frameworkLabelsFromQuestion(question, item);
  const evidence = question?.evidenceExpectationIds ?? [];
  return (
    <div className="ownerQuestionPanel" aria-label="Assessment question summary">
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
        <article>
          <span className="label">Evidence required</span>
          <strong>{evidence.length}</strong>
          <small>{evidence.join(", ") || "No expected evidence declared."}</small>
        </article>
        <article>
          <span className="label">Current answer</span>
          <p>{item.answerText ?? "No answer submitted yet."}</p>
        </article>
      </div>
    </div>
  );
}

function ReviewerQuestionPanel({ question, item }: { question: AssessmentQuestionOption | null; item: AssessmentItem }) {
  const frameworks = frameworkLabelsFromQuestion(question, item);
  const evidence = question?.evidenceExpectationIds ?? [];
  const citations = question?.citations ?? [];
  return (
    <div className="ownerQuestionPanel" aria-label="Submitted assessment review summary">
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
  );
}

function ReviewerActions({ assessment, item }: { assessment: Assessment; item: AssessmentItem }) {
  const allItemsApproved = assessment.items.every((candidate) => candidate.status === "approved");
  if (item.status === "submitted") {
    return (
      <>
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Approve submitted assessment item">
          <input type="hidden" name="intent" value="reviewItem" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
          <HiddenIdempotency />
          <input type="hidden" name="approved" value="true" />
          <label>
            Review note
            <textarea name="reason" defaultValue="Evidence and answer are sufficient for approval." />
          </label>
          <button type="submit">Approve item</button>
        </form>
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Request changes for submitted assessment item">
          <input type="hidden" name="intent" value="reviewItem" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
          <HiddenIdempotency />
          <input type="hidden" name="approved" value="false" />
          <label>
            Change request
            <textarea name="reason" placeholder="Explain what the control owner must fix before resubmitting." required></textarea>
          </label>
          <button type="submit">Request changes</button>
        </form>
      </>
    );
  }
  if (item.status === "approved" || item.status === "closed") {
    return (
      <>
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Reopen reviewed assessment item">
          <input type="hidden" name="intent" value="reopenItem" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
          <HiddenIdempotency />
          <label>
            Reopen reason
            <textarea name="reason" placeholder="Explain why the control owner must update this answer or evidence." required></textarea>
          </label>
          <button type="submit">Reopen for changes</button>
        </form>
        {allItemsApproved && assessment.status !== "closed" ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Close approved assessment">
            <input type="hidden" name="intent" value="closeAssessment" />
            <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
            <HiddenIdempotency />
            <p>All assessment items are approved. Closing archives this assessment.</p>
            <button type="submit">Close assessment</button>
          </form>
        ) : null}
        {assessment.status === "approved" ? (
          <div className="miniForm" aria-label="Open findings workspace">
            <strong>Findings</strong>
            <p>Optional: record a gap only if this approved assessment revealed missing evidence, failed operation, or remediation need.</p>
            <Link className="reviewLink" href={`/findings?assessmentId=${assessment.id}&itemId=${item.id}`}>
              Open findings workspace
            </Link>
          </div>
        ) : null}
      </>
    );
  }
  if (item.status === "needs_changes") {
    return (
      <div className="constraintNote">
        Changes have been requested. The control owner can update the answer, upload new evidence, and resubmit from the Assessment Workspace.
      </div>
    );
  }
  return (
    <div className="constraintNote">
      Review actions become available after the control owner submits an answer with evidence.
    </div>
  );
}

function QuestionAnswerInput({
  question,
  currentAnswer
}: {
  question: AssessmentQuestionOption | null;
  currentAnswer?: string;
}) {
  const responseType = question?.responseType ?? "text";
  if (responseType === "boolean") {
    return (
      <label>
        Boolean answer
        <select name="answerText" defaultValue={currentAnswer ?? "Yes"}>
          <option value="Yes">Yes</option>
          <option value="No">No</option>
        </select>
      </label>
    );
  }
  if (responseType === "maturity") {
    return (
      <label>
        Maturity level
        <select name="answerText" defaultValue={currentAnswer ?? "3 - Defined"}>
          <option value="1 - Initial">1 - Initial</option>
          <option value="2 - Repeatable">2 - Repeatable</option>
          <option value="3 - Defined">3 - Defined</option>
          <option value="4 - Managed">4 - Managed</option>
          <option value="5 - Optimized">5 - Optimized</option>
        </select>
      </label>
    );
  }
  if (responseType === "multi_select") {
    const defaults = new Set((currentAnswer ?? "").split(",").map((entry) => entry.trim()).filter(Boolean));
    const options = question?.evidenceExpectationIds.length
      ? question.evidenceExpectationIds
      : ["Policy", "Procedure", "Implementation evidence", "Review record"];
    return (
      <fieldset>
        <legend>Multi-select answer</legend>
        {options.map((option) => (
          <label key={option}>
            <input type="checkbox" name="answerChoice" value={option} defaultChecked={defaults.has(option)} />
            {option}
          </label>
        ))}
      </fieldset>
    );
  }
  return (
    <label>
      Text answer
      <textarea name="answerText" defaultValue={currentAnswer ?? "Quarterly access review completed for the scoped population."} />
    </label>
  );
}

function EvidenceWorkflow({
  assessment,
  item,
  question,
  evidenceObjects,
  selectedEvidence,
  selectedEvidenceScanStatus,
  selectedEvidenceVersions,
  uploadPolicy,
  ownerId,
  reuseResult,
  mode
}: {
  assessment: Assessment;
  item: AssessmentItem | null;
  question: AssessmentQuestionOption | null;
  evidenceObjects: EvidenceObject[];
  selectedEvidence: EvidenceObject | null;
  selectedEvidenceScanStatus: EvidenceScanStatus | null;
  selectedEvidenceVersions: EvidenceVersion[];
  uploadPolicy: EvidenceUploadPolicy | null;
  ownerId: string;
  reuseResult: string;
  mode: AssessmentWorkspaceMode;
}) {
  const returnToPath = mode === "review" ? "/assessments/review" : "/assessments";
  const defaultScopeTags = item
    ? evidenceScopeTagsForQuestion(question, item)
    : assessmentFrameworks(assessment).map(scopeTagFromValue).filter(Boolean);
  const defaultPeriodStart = dateInputValue(assessment.periodStart);
  const defaultPeriodEnd = dateInputValue(assessment.periodEnd);
  const canUploadOwnerEvidence = mode === "owner" && (!item || canEditAssessmentItem(item));
  const displayedEvidenceObjects = mode === "review" && item
    ? evidenceObjects.filter((evidence) => item.evidenceIds.includes(evidence.id))
    : evidenceObjects;
  const displayedSelectedEvidence = selectedEvidence && (mode !== "review" || item?.evidenceIds.includes(selectedEvidence.id))
    ? selectedEvidence
    : null;
  return (
    <section className="workspace" aria-labelledby="evidence-workflow-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{mode === "review" ? "Evidence review" : "Evidence upload"}</p>
          <h2 id="evidence-workflow-heading">{mode === "review" ? "Evidence checks and reuse" : "Quarantine, scan, and submit evidence"}</h2>
        </div>
        <span>{mode === "review" ? "review and reuse" : "pending to quarantined to committed/rejected"}</span>
      </div>
      <EvidenceTable evidenceObjects={displayedEvidenceObjects} assessment={assessment} item={item} mode={mode} />
      {displayedSelectedEvidence ? (
        <EvidenceDetail
          evidence={displayedSelectedEvidence}
          versions={selectedEvidenceVersions}
          scanStatus={selectedEvidenceScanStatus}
          assessment={assessment}
          item={item}
          mode={mode}
        />
      ) : mode === "owner" ? (
        <EmptyState
          title="No evidence selected"
          detail={canUploadOwnerEvidence
            ? "View a previously submitted file, upload a new evidence file, or submit the answer with no evidence needed."
            : "This item has been submitted. Evidence upload is locked while it is awaiting review."}
        />
      ) : null}
      {showExtendedReviewWorkflows && mode === "review" && reuseResult ? (
        <div className="constraintNote">Reuse check result: {reuseResult === "yes" ? "Reusable" : "Not reusable"}</div>
      ) : null}
      <div className="workflowGrid">
        {canUploadOwnerEvidence ? (
          uploadPolicy ? (
            <EvidenceUploadPanel
              assessmentId={assessment.id}
              itemId={item?.id}
              ownerId={ownerId}
              uploadPolicy={uploadPolicy}
              defaultScopeTags={defaultScopeTags}
              defaultPeriodStart={defaultPeriodStart}
              defaultPeriodEnd={defaultPeriodEnd}
            />
          ) : (
            <div className="miniForm">
              <div className="constraintNote errorNote">Evidence upload policy is unavailable.</div>
            </div>
          )
        ) : mode === "owner" ? (
          <div className="constraintNote">
            Evidence upload is locked because this answer has already been submitted. A reviewer can reopen the item if more evidence is required.
          </div>
        ) : null}
        {showExtendedReviewWorkflows && mode === "review" && displayedSelectedEvidence ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Check evidence reuse">
            <input type="hidden" name="intent" value="checkEvidenceReuse" />
            <SelectedHidden assessment={assessment} item={item} evidence={displayedSelectedEvidence} returnToPath={returnToPath} />
              <label>
                Reuse period start
                <input name="periodStart" type="date" defaultValue={defaultPeriodStart} />
              </label>
              <label>
                Reuse period end
                <input name="periodEnd" type="date" defaultValue={defaultPeriodEnd} />
              </label>
            <label>
              Required tags
              <input name="scopeTags" defaultValue="soc2" />
            </label>
            <button type="submit">Check reuse</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function RiskWorkflow({
  assessment,
  item,
  findings,
  selectedFinding,
  tasks,
  selectedTask,
  ownerId
}: {
  assessment: Assessment;
  item: AssessmentItem;
  findings: Finding[];
  selectedFinding: Finding | null;
  tasks: RemediationTask[];
  selectedTask: RemediationTask | null;
  ownerId: string;
}) {
  return (
    <section className="workspace" aria-labelledby="risk-workflow-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">RiskWorkflow</p>
          <h2 id="risk-workflow-heading">Findings and remediation</h2>
        </div>
        <span>{findings.length} findings</span>
      </div>
      <RiskTables findings={findings} tasks={tasks} assessment={assessment} item={item} />
      <div className="workflowGrid">
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Create risk finding">
          <input type="hidden" name="intent" value="createFinding" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
          <HiddenIdempotency />
          <label>
            Severity
            <select name="severity" defaultValue="high">
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </label>
          <label>
            Description
            <textarea name="description" defaultValue="Control evidence is stale and requires remediation." />
          </label>
          <button type="submit">Create finding</button>
        </form>
        {selectedFinding ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Update finding">
            <input type="hidden" name="intent" value="updateFinding" />
            <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
            <HiddenIdempotency />
            <input type="hidden" name="findingId" value={selectedFinding.id} />
            <label>
              Severity
              <select name="severity" defaultValue={selectedFinding.severity}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </label>
            <label>
              Description
              <input name="description" defaultValue={selectedFinding.description} />
            </label>
            <button type="submit">Update finding</button>
          </form>
        ) : null}
        {selectedFinding ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Create remediation task">
            <input type="hidden" name="intent" value="createRemediationTask" />
            <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
            <HiddenIdempotency />
            <input type="hidden" name="findingId" value={selectedFinding.id} />
            <input type="hidden" name="ownerId" value={ownerId} />
            <label>
              Due at
              <input name="dueAt" defaultValue="2026-09-30T00:00:00.000Z" />
            </label>
            <button type="submit">Create remediation task</button>
          </form>
        ) : null}
        {selectedTask ? (
          <>
            <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Update remediation task">
              <input type="hidden" name="intent" value="updateRemediationTask" />
              <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
              <HiddenIdempotency />
              <input type="hidden" name="taskId" value={selectedTask.id} />
              <input type="hidden" name="ownerId" value={ownerId} />
              <input type="hidden" name="status" value="in_progress" />
              <label>
                Due at
                <input name="dueAt" defaultValue={selectedTask.dueAt} />
              </label>
              <button type="submit">Mark task in progress</button>
            </form>
            <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Accept remediation risk">
              <input type="hidden" name="intent" value="acceptRisk" />
              <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
              <HiddenIdempotency />
              <input type="hidden" name="taskId" value={selectedTask.id} />
              <label>
                Acceptance reason
                <textarea name="reason" defaultValue="Residual risk accepted by the control owner for the scoped period." />
              </label>
              <label>
                Expires at
                <input name="expiresAt" defaultValue="2027-01-01T00:00:00.000Z" />
              </label>
              <label>
                Next review due at
                <input name="nextReviewDueAt" defaultValue="2026-10-01T00:00:00.000Z" />
              </label>
              <label>
                Compensating controls (optional)
                <textarea name="compensatingControls" defaultValue="" />
              </label>
              <button type="submit">Accept risk</button>
            </form>
          </>
        ) : null}
      </div>
    </section>
  );
}

function ExecutionHistory({
  answerHistory,
  applicabilityHistory,
  reviewHistory
}: {
  answerHistory: AnswerRevision[];
  applicabilityHistory: ApplicabilityDecision[];
  reviewHistory: ReviewDecision[];
}) {
  return (
    <section className="workspace" aria-labelledby="execution-history-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">G-01 execution graph</p>
          <h2 id="execution-history-heading">Answer, applicability, and review history</h2>
        </div>
        <span>{answerHistory.length} revisions</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Answer revisions</span>
          {answerHistory.length === 0 ? (
            <p>No answers submitted yet.</p>
          ) : (
            <ol className="historyList">
              {answerHistory.map((revision) => (
                <li key={revision.id}>
                  <strong>Rev {revision.revision}</strong> by <code>{revision.submittedBy}</code> at{" "}
                  {formatDateTime(revision.submittedAt)}
                  <p>{String(revision.responseJson.answerText ?? "")}</p>
                </li>
              ))}
            </ol>
          )}
        </article>
        <article>
          <span className="label">Applicability decisions</span>
          {applicabilityHistory.length === 0 ? (
            <p>No applicability decision recorded yet.</p>
          ) : (
            <ol className="historyList">
              {applicabilityHistory.map((decision) => (
                <li key={decision.id}>
                  <strong>{decision.decision}</strong> by <code>{decision.decidedBy}</code> at{" "}
                  {formatDateTime(decision.decidedAt)}
                  <p>{decision.rationale}</p>
                </li>
              ))}
            </ol>
          )}
        </article>
        <article>
          <span className="label">Review decisions</span>
          {reviewHistory.length === 0 ? (
            <p>No review decision recorded yet (a reviewer distinct from the submitter is required).</p>
          ) : (
            <ol className="historyList">
              {reviewHistory.map((decision) => (
                <li key={decision.id}>
                  <strong>{decision.decision}</strong> by <code>{decision.reviewerId}</code> at{" "}
                  {formatDateTime(decision.decidedAt)}
                  {decision.rationale ? <p>{decision.rationale}</p> : null}
                </li>
              ))}
            </ol>
          )}
        </article>
      </div>
    </section>
  );
}

function TestProcedureWorkflow({
  assessment,
  item,
  testProcedures,
  testResults
}: {
  assessment: Assessment;
  item: AssessmentItem;
  testProcedures: TestProcedure[];
  testResults: ManualControlTestResult[];
}) {
  const latestProcedure = testProcedures[0] ?? null;
  return (
    <section className="workspace" aria-labelledby="test-procedure-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">G-01 execution graph</p>
          <h2 id="test-procedure-heading">Test procedures and results</h2>
        </div>
        <span>{testProcedures.length} procedures, {testResults.length} results</span>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Test procedures</caption>
          <thead>
            <tr>
              <th scope="col">Procedure key</th>
              <th scope="col">Method</th>
              <th scope="col">Expected result</th>
              <th scope="col">Status</th>
            </tr>
          </thead>
          <tbody>
            {testProcedures.length === 0 ? (
              <tr>
                <td colSpan={4}>No test procedures defined yet.</td>
              </tr>
            ) : (
              testProcedures.map((procedure) => (
                <tr key={procedure.id}>
                  <td>{procedure.procedureKey}</td>
                  <td>{procedure.method}</td>
                  <td>{procedure.expectedResult}</td>
                  <td><span className="badge internal">{procedure.status}</span></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Test results</caption>
          <thead>
            <tr>
              <th scope="col">Result</th>
              <th scope="col">Population</th>
              <th scope="col">Tested by</th>
              <th scope="col">Tested at</th>
            </tr>
          </thead>
          <tbody>
            {testResults.length === 0 ? (
              <tr>
                <td colSpan={4}>No test results recorded yet.</td>
              </tr>
            ) : (
              testResults.map((result) => (
                <tr key={result.id}>
                  <td><span className={`badge ${result.result === "pass" ? "internal" : "confidential"}`}>{result.result}</span></td>
                  <td>{result.population ?? "—"}</td>
                  <td>{result.testedBy}</td>
                  <td>{formatDateTime(result.testedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="workflowGrid">
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Define test procedure">
          <input type="hidden" name="intent" value="createTestProcedure" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
          <HiddenIdempotency />
          <label>
            Procedure key
            <input name="procedureKey" defaultValue={`tp-${item.controlRef.harmonizedControlId}-${Date.now()}`} required />
          </label>
          <label>
            Method
            <textarea name="method" defaultValue="Inspect the access review log for the assessment period." required />
          </label>
          <label>
            Expected result
            <textarea name="expectedResult" defaultValue="Every access grant has a documented, dated approver." required />
          </label>
          <button type="submit">Define test procedure</button>
        </form>
        {latestProcedure ? (
          <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Record test result">
            <input type="hidden" name="intent" value="recordControlTestResult" />
            <AssessmentHidden assessment={assessment} item={item} returnToPath="/assessments/review" />
            <HiddenIdempotency />
            <input type="hidden" name="testProcedureId" value={latestProcedure.id} />
            <label>
              Result
              <select name="result" defaultValue="pass">
                <option value="pass">Pass</option>
                <option value="fail">Fail</option>
                <option value="not_tested">Not tested</option>
              </select>
            </label>
            <label>
              Population (optional)
              <input name="population" defaultValue="All Q2 access grants" />
            </label>
            <button type="submit">Record result for &quot;{latestProcedure.procedureKey}&quot;</button>
          </form>
        ) : null}
      </div>
    </section>
  );
}

function SignoffSummary({ assessment, signoffs }: { assessment: Assessment; signoffs: AssessmentSignoff[] }) {
  return (
    <section className="workspace" aria-labelledby="signoff-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">G-01 execution graph</p>
          <h2 id="signoff-heading">Assessment sign-offs</h2>
        </div>
        <span>{signoffs.length} sign-off{signoffs.length === 1 ? "" : "s"}</span>
      </div>
      {signoffs.length === 0 ? (
        <EmptyState
          title="No sign-off recorded yet"
          detail={`Sign-offs are recorded automatically when "${assessment.scopeName}" is closed.`}
        />
      ) : (
        <div className="tableScroller">
          <table>
            <caption>Sign-offs</caption>
            <thead>
              <tr>
                <th scope="col">Scope</th>
                <th scope="col">Decision</th>
                <th scope="col">Signer</th>
                <th scope="col">Signed at</th>
              </tr>
            </thead>
            <tbody>
              {signoffs.map((signoff) => (
                <tr key={signoff.id}>
                  <td>{signoff.scopeType}</td>
                  <td><span className={`badge ${signoff.decision === "approved" ? "internal" : "confidential"}`}>{signoff.decision}</span></td>
                  <td>{signoff.signerId}</td>
                  <td>{formatDateTime(signoff.signedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function ReportWorkflow({ assessment, exports, selectedExport }: { assessment: Assessment; exports: ReportExport[]; selectedExport: ReportExport | null }) {
  return (
    <section className="workspace" aria-labelledby="report-workflow-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">ReportingAnalytics</p>
          <h2 id="report-workflow-heading">Frozen snapshot exports</h2>
        </div>
        <span>Downloads re-render deterministically</span>
      </div>
      <form className="filterForm" action={assessmentActionPath} method="post" aria-label="Request report export">
        <input type="hidden" name="intent" value="requestReportExport" />
        <input type="hidden" name="assessmentId" value={assessment.id} />
        <input type="hidden" name="itemId" value={assessment.items[0]?.id ?? ""} />
        <input type="hidden" name="returnTo" value="/assessments/review" />
        <label>
          Snapshot ID
          <input name="snapshotId" defaultValue={assessment.controlSnapshotVersion} />
        </label>
        <label>
          Template version
          <input name="templateVersion" defaultValue="m2-readiness-v1" />
        </label>
        <label>
          Format
          <select name="format" defaultValue="pdf">
            <option value="pdf">PDF</option>
            <option value="xlsx">Excel</option>
          </select>
        </label>
        <div className="formActions">
          <button type="submit">Request report export</button>
        </div>
      </form>
      <ReportTable exports={exports} selectedExport={selectedExport} />
    </section>
  );
}

function EvidenceTable({
  evidenceObjects,
  assessment,
  item,
  mode
}: {
  evidenceObjects: EvidenceObject[];
  assessment: Assessment;
  item: AssessmentItem | null;
  mode: AssessmentWorkspaceMode;
}) {
  if (evidenceObjects.length === 0) {
    return mode === "review"
      ? <EmptyState title="No evidence submitted with this answer" detail="Request changes if evidence is required before this item can be approved." />
      : <EmptyState title="No previous evidence yet" detail="Upload a file below to start the quarantine, scan, and commit lifecycle." />;
  }
  const basePath = mode === "review" ? "/assessments/review" : "/assessments";
  return (
    <div className="tableScroller">
      <table>
        <caption>{mode === "review" ? "Submitted evidence for this answer" : "Previously submitted evidence"}</caption>
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
              <td>{evidence.scopeTags.join(", ")}</td>
              <td><code>{evidence.sha256?.slice(0, 24) ?? "pending scan"}</code></td>
              <td>
                {evidence.state === "committed" ? (
                  <a href={`/api/backend/v1/evidence/objects/${evidence.id}/download`} target="_blank" rel="noreferrer">
                    View file
                  </a>
                ) : (
                  <Link href={`${basePath}?assessmentId=${assessment.id}${item ? `&itemId=${item.id}` : ""}&evidenceId=${evidence.id}`}>
                    Inspect
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EvidenceDetail({
  evidence,
  versions,
  scanStatus,
  assessment,
  item,
  mode
}: {
  evidence: EvidenceObject;
  versions: EvidenceVersion[];
  scanStatus: EvidenceScanStatus | null;
  assessment: Assessment;
  item: AssessmentItem | null;
  mode: AssessmentWorkspaceMode;
}) {
  const returnToPath = mode === "review" ? "/assessments/review" : "/assessments";
  const latestVersion = versions[0] ?? null;
  const canDownload = evidence.state === "committed" && latestVersion?.contentAvailable;
  return (
    <div className="detailGrid">
      <article>
        <span className="label">Selected evidence</span>
        <strong>{evidence.fileName}</strong>
        <small>{evidence.classification} | {evidence.scopeTags.join(", ") || "no scope tags"}</small>
      </article>
      <article>
        <span className="label">State</span>
        <strong>{evidence.state}</strong>
        <small>{evidence.state === "committed" ? "Ready to use with an answer." : "Not usable until it is clean and committed."}</small>
      </article>
      <article>
        <span className="label">File access</span>
        {canDownload ? (
          <a className="reviewLink" href={`/api/backend/v1/evidence/objects/${evidence.id}/download`} target="_blank" rel="noreferrer">
            View file
          </a>
        ) : (
          <strong>Preview unavailable</strong>
        )}
        <small>
          {canDownload
            ? "Served through the authenticated backend proxy."
            : latestVersion
              ? "This version has metadata and hash only; upload a new version to retain downloadable content."
              : "No committed evidence version has been recorded yet."}
        </small>
      </article>
      <article>
        <span className="label">Storage</span>
        <strong>{latestVersion?.contentAvailable ? "Retained evidence version" : "Metadata and hash record"}</strong>
        <small>{evidence.storageUri ?? latestVersion?.objectUri ?? "Storage reference pending"}</small>
      </article>
      <article>
        <span className="label">Committed hash</span>
        <code>{evidence.sha256 ?? "Not committed"}</code>
      </article>
      <article>
        <span className="label">Live scan status</span>
        <strong style={{ color: scanStatus?.state === "rejected" ? "#ef4444" : "inherit" }}>
          {scanStatus?.state ?? "Not available"}
        </strong>
        <small>{scanStatus ? `Updated ${formatDateTime(scanStatus.updatedAt)}` : "Scan status not available"}</small>
        <form className="miniForm" action={assessmentActionPath} method="post" aria-label="Refresh scan status">
          <input type="hidden" name="intent" value="refreshScanStatus" />
          <AssessmentHidden assessment={assessment} item={item} returnToPath={returnToPath} />
          <button type="submit" className="secondary">Refresh scan status</button>
        </form>
        <small>Use refresh when a scanner is still processing or the status changed after upload.</small>
        {scanStatus?.state === "rejected" ? (
          <div className="badge restricted" style={{ marginTop: "6px", display: "inline-block", backgroundColor: "#ef4444", color: "#ffffff" }}>
            MALWARE DETECTED
          </div>
        ) : null}
        {scanStatus?.state === "committed" ? (
          <div className="badge internal" style={{ marginTop: "6px", display: "inline-block" }}>
            Clean Scan
          </div>
        ) : null}
      </article>
    </div>
  );
}

function RiskTables({ findings, tasks, assessment, item }: { findings: Finding[]; tasks: RemediationTask[]; assessment: Assessment; item: AssessmentItem }) {
  return (
    <div className="detailGrid">
      <article>
        <span className="label">Findings</span>
        <strong>{findings.length}</strong>
        <small>{findings[0]?.description ?? "No findings yet"}</small>
        {findings[0] ? <Link href={`/assessments/review?assessmentId=${assessment.id}&itemId=${item.id}&findingId=${findings[0].id}`}>Select latest finding</Link> : null}
      </article>
      <article>
        <span className="label">Remediation tasks</span>
        <strong>{tasks.length}</strong>
        <small>{tasks[0]?.status ?? "No task yet"}</small>
        {tasks[0] ? <Link href={`/assessments/review?assessmentId=${assessment.id}&itemId=${item.id}&findingId=${tasks[0].findingId}&taskId=${tasks[0].id}`}>Select latest task</Link> : null}
      </article>
      <article>
        <span className="label">Risk acceptance note</span>
        <p>Acceptance reasons are stored in outbox/audit payloads by backend design, not on the task record.</p>
      </article>
    </div>
  );
}

function ReportTable({ exports, selectedExport }: { exports: ReportExport[]; selectedExport: ReportExport | null }) {
  if (exports.length === 0) {
    return <EmptyState title="No exports yet" detail="Request a report export after the assessment snapshot is ready." />;
  }
  return (
    <div className="tableScroller">
      <table>
        <caption>Report exports</caption>
        <thead>
          <tr>
            <th scope="col">Format</th>
            <th scope="col">Snapshot</th>
            <th scope="col">Integrity hash</th>
            <th scope="col">Download</th>
          </tr>
        </thead>
        <tbody>
          {exports.map((entry) => (
            <tr key={entry.id}>
              <td>{entry.format}</td>
              <td>{entry.snapshotId}</td>
              <td><code>{entry.sha256.slice(0, 24)}</code></td>
              <td><a className="reviewLink" href={`/api/backend/v1/report-exports/${entry.id}/download`}>{selectedExport?.id === entry.id ? "Download selected export" : "Download"}</a></td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="constraintNote">Downloads serve the frozen export artifact and verify the stored SHA-256 integrity signature.</p>
    </div>
  );
}

function AssessmentHidden({
  assessment,
  item,
  returnToPath = "/assessments"
}: {
  assessment: Assessment;
  item: AssessmentItem | null;
  returnToPath?: "/assessments" | "/assessments/review";
}) {
  return (
    <>
      <input type="hidden" name="assessmentId" value={assessment.id} />
      {item ? <input type="hidden" name="itemId" value={item.id} /> : null}
      <input type="hidden" name="returnTo" value={returnToPath} />
    </>
  );
}

function groupQuestionOptions(questionOptions: AssessmentQuestionOption[]): Array<{
  harmonizedControlId: string;
  harmonizedControlName: string;
  options: AssessmentQuestionOption[];
}> {
  const groups = new Map<string, { harmonizedControlId: string; harmonizedControlName: string; options: AssessmentQuestionOption[] }>();
  for (const option of questionOptions) {
    const existing = groups.get(option.harmonizedControlId);
    if (existing) {
      existing.options.push(option);
      continue;
    }
    groups.set(option.harmonizedControlId, {
      harmonizedControlId: option.harmonizedControlId,
      harmonizedControlName: option.harmonizedControlName,
      options: [option]
    });
  }
  return [...groups.values()].map((group) => ({
    ...group,
    options: sortQuestionOptions(group.options)
  }));
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

function responseTypeLabel(value: AssessmentQuestionOption["responseType"]): string {
  return value === "multi_select" ? "Multi-select" : value[0].toUpperCase() + value.slice(1);
}

function questionTypeSummary(questionOptions: AssessmentQuestionOption[]): Array<{ responseType: AssessmentQuestionOption["responseType"]; count: number }> {
  const counts = new Map<AssessmentQuestionOption["responseType"], number>();
  for (const option of questionOptions) {
    counts.set(option.responseType, (counts.get(option.responseType) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort(([left], [right]) => responseTypeRank(left) - responseTypeRank(right))
    .map(([responseType, count]) => ({ responseType, count }));
}

function sortQuestionOptions(questionOptions: AssessmentQuestionOption[]): AssessmentQuestionOption[] {
  return [...questionOptions].sort((left, right) =>
    responseTypeRank(left.responseType) - responseTypeRank(right.responseType) ||
    left.questionText.localeCompare(right.questionText)
  );
}

function responseTypeRank(value: AssessmentQuestionOption["responseType"]): number {
  if (value === "boolean") {
    return 0;
  }
  if (value === "maturity") {
    return 1;
  }
  if (value === "multi_select") {
    return 2;
  }
  return 3;
}

function canCreateAssessment(session: Awaited<ReturnType<typeof requireSession>>): boolean {
  const roles = session.roles.map((role) => role.toLowerCase());
  return session.scopes.includes("assessment:write") || roles.includes("platform_admin") || roles.includes("compliance_manager");
}

function assessmentMatchesFilters(
  assessment: Assessment,
  filters: { framework: string; status: string; search: string }
): boolean {
  const frameworks = assessmentFrameworks(assessment).map((entry) => entry.toLowerCase());
  const searchSpace = [
    assessment.scopeName,
    assessment.status,
    assessment.controlSnapshotVersion,
    ...assessment.items.flatMap((entry) => [
      entry.controlRef.frameworkKey ?? "",
      entry.controlRef.controlId ?? "",
      entry.controlRef.harmonizedControlId ?? "",
      entry.controlRef.questionVersionId ?? ""
    ])
  ].join(" ").toLowerCase();

  return (
    (!filters.framework || frameworks.some((entry) => entry.includes(filters.framework.toLowerCase()))) &&
    (!filters.status || assessment.status === filters.status) &&
    (!filters.search || searchSpace.includes(filters.search))
  );
}

function groupAssessmentsByWorkspaceStatus(assessments: Assessment[]): {
  draft: Assessment[];
  inProgress: Assessment[];
  pendingReview: Assessment[];
  approved: Assessment[];
  closed: Assessment[];
} {
  return {
    draft: assessments.filter((entry) => entry.status === "not_started"),
    inProgress: assessments.filter((entry) => entry.status === "in_progress" || entry.status === "needs_changes"),
    pendingReview: assessments.filter((entry) => entry.status === "submitted"),
    approved: assessments.filter((entry) => entry.status === "approved"),
    closed: assessments.filter((entry) => entry.status === "closed")
  };
}

function assessmentProgress(assessment: Assessment): { approved: number; total: number } {
  return {
    approved: assessment.items.filter((entry) => entry.status === "approved" || entry.status === "closed").length,
    total: assessment.items.length
  };
}

function assessmentFrameworks(assessment: Assessment): string[] {
  return [...new Set(assessment.items.map((entry) => entry.controlRef.frameworkKey).filter((value): value is string => Boolean(value)))].sort();
}

function assessmentHasReviewableSubmission(assessment: Assessment): boolean {
  return assessment.items.some((item) =>
    item.status === "submitted" ||
    item.status === "needs_changes" ||
    item.status === "approved" ||
    item.status === "closed" ||
    Boolean(item.answerText?.trim()) ||
    item.evidenceIds.length > 0
  );
}

function canEditAssessmentItem(item: AssessmentItem): boolean {
  return item.status === "not_started" || item.status === "in_progress" || item.status === "needs_changes";
}

function frameworkLabelsFromQuestion(question: AssessmentQuestionOption | null, item: AssessmentItem): string[] {
  if (question) {
    return frameworkLabels(question);
  }
  return [...new Set([item.controlRef.frameworkKey ?? "", item.controlRef.controlId ?? ""].filter(Boolean))].sort();
}

function evidenceScopeTagsForQuestion(question: AssessmentQuestionOption | null, item: AssessmentItem): string[] {
  const frameworkTags = question?.frameworkKeys.length
    ? question.frameworkKeys
    : [question?.frameworkKey ?? item.controlRef.frameworkKey ?? ""];
  const rawTags = [
    ...frameworkTags,
    question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? "",
    question?.harmonizedControlName ?? "",
    question?.controlId ?? item.controlRef.controlId ?? "",
    question?.controlTitle ?? ""
  ];
  const tags = rawTags.map(scopeTagFromValue).filter(Boolean);
  return [...new Set(tags)].slice(0, 12);
}

function scopeTagFromValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9_]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function dateInputValue(value: string): string {
  return value.includes("T") ? value.slice(0, 10) : value;
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

function SelectedHidden({
  assessment,
  item,
  evidence,
  returnToPath = "/assessments"
}: {
  assessment: Assessment;
  item: AssessmentItem | null;
  evidence?: EvidenceObject;
  returnToPath?: "/assessments" | "/assessments/review";
}) {
  return (
    <>
      <input type="hidden" name="assessmentId" value={assessment.id} />
      <input type="hidden" name="itemId" value={item?.id ?? ""} />
      {evidence ? <input type="hidden" name="evidenceId" value={evidence.id} /> : null}
      <input type="hidden" name="returnTo" value={returnToPath} />
    </>
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
