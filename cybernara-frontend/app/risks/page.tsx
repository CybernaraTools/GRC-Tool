import Link from "next/link";
import { randomUUID } from "node:crypto";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import { RiskAiAssistForm } from "./risk-ai-assist-form";
import { RemediationReviewAiAssistForm } from "./remediation-review-ai-assist-form";
import type {
  Assessment,
  AssessmentItem,
  AssessmentQuestionOption,
  EvidenceLink,
  EvidenceObject,
  EvidenceVersion,
  Finding,
  RemediationTask,
  RemediationTaskReview,
  Risk,
  RiskAcceptance,
  RiskLink,
  RiskModel,
  RiskTreatment
} from "../../src/lib/api/generated";
import { canCreateRisk, canPerform, canReviewAssessment } from "../../src/lib/authorization";
import { firstValue, formatDateTime, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";
import { isTenantSession } from "../../src/lib/session";

type RisksPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

type RiskContext = {
  risk: Risk;
  links: RiskLink[];
  treatments: RiskTreatment[];
};

type AcceptanceContext = {
  task: RemediationTask;
  acceptance: RiskAcceptance | null;
};

type EvidenceContext = {
  object: EvidenceObject;
  version: EvidenceVersion | null;
  links: EvidenceLink[];
};

type TaskReviewContext = {
  task: RemediationTask;
  reviews: RemediationTaskReview[];
};

const risksActionPath = "/risks/actions";

export default async function RisksPage({ searchParams }: RisksPageProps) {
  const params = searchParams ? await searchParams : {};
  const nextPath = `/risks${serializeSearchParams(params)}`;
  const session = await requireSession(nextPath);

  if (!isTenantSession(session)) {
    return (
      <AppShell session={session} title="Risk & Acceptance">
        <ErrorState title="Tenant workspace required" detail="Risk and acceptance workflows belong to a client tenant, not the platform super-admin layer." />
      </AppShell>
    );
  }

  const canReadRiskWorkflow = canPerform(session, ["finding:read", "remediation_task:read", "risk:read"]);
  const canWriteRisk = canCreateRisk(session);
  const canWriteRemediation = canPerform(session, "remediation_task:write");
  if (!canReadRiskWorkflow) {
    return (
      <AppShell session={session} title="Risk & Acceptance">
        <ErrorState title="Risk workspace could not be loaded" detail="Your session is missing finding, remediation-task, or risk read scope." />
      </AppShell>
    );
  }

  const api = createServerApiClient(session);
  let assessments: Assessment[] = [];
  let questionOptions: AssessmentQuestionOption[] = [];
  let findings: Finding[] = [];
  let tasks: RemediationTask[] = [];
  let riskModels: RiskModel[] = [];
  let risks: Risk[] = [];
  let riskContexts: RiskContext[] = [];
  let acceptanceContexts: AcceptanceContext[] = [];
  let evidenceContexts: EvidenceContext[] = [];
  let taskReviewContexts: TaskReviewContext[] = [];
  let apiError: string | null = null;

  try {
    [assessments, questionOptions, findings, tasks, risks, riskModels] = await Promise.all([
      api.listAssessments({ limit: 100, offset: 0 }),
      api.listAssessmentQuestionOptions({ limit: 100, offset: 0 }),
      api.listRiskFindings({ limit: 100, offset: 0 }),
      api.listRemediationTasks({ limit: 100, offset: 0 }),
      api.listRisks({ limit: 100, offset: 0 }),
      canPerform(session, "risk_model:read") ? api.listRiskModels({ limit: 100, offset: 0 }) : Promise.resolve([])
    ]);

    riskContexts = await Promise.all(
      risks.map(async (risk) => ({
        risk,
        links: await api.listRiskLinks(risk.id, { limit: 100, offset: 0 }).catch(() => []),
        treatments: await api.listRiskTreatments(risk.id, { limit: 100, offset: 0 }).catch(() => [])
      }))
    );
    acceptanceContexts = await Promise.all(
      tasks.map(async (task) => ({
        task,
        acceptance: await api.getRemediationTaskRiskAcceptance(task.id).catch(() => null)
      }))
    );
    const evidenceObjects = canPerform(session, "evidence_object:read")
      ? await api.listEvidenceObjects({ limit: 50, offset: 0, state: "committed" }).catch(() => [])
      : [];
    evidenceContexts = await Promise.all(
      evidenceObjects.map(async (object) => {
        const versions = await api.listEvidenceVersions(object.id, { limit: 1, offset: 0 }).catch(() => []);
        const version = versions[0] ?? null;
        const links = version ? await api.listEvidenceLinks(version.id, { limit: 100, offset: 0 }).catch(() => []) : [];
        return { object, version, links };
      })
    );
    taskReviewContexts = await Promise.all(
      tasks.map(async (task) => ({
        task,
        reviews: await api.listRemediationTaskReviews(task.id, { limit: 20, offset: 0 }).catch(() => [])
      }))
    );
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const selectedFindingId = textParam(params, "findingId");
  const selectedRiskId = textParam(params, "riskId");
  const selectedTaskId = textParam(params, "taskId");
  const workflowMode = textParam(params, "mode");
  const workflowChoice = textParam(params, "choice");
  const selectedFinding = findings.find((finding) => finding.id === selectedFindingId) ?? null;
  const selectedTarget = selectedFinding ? findingTarget(assessments, selectedFinding) : { assessment: null, item: null };
  const selectedQuestion = selectedTarget.item?.controlRef.questionVersionId
    ? questionOptions.find((option) => option.questionVersionId === selectedTarget.item?.controlRef.questionVersionId) ?? null
    : null;
  const selectedRiskContexts = selectedFinding
    ? riskContexts.filter((context) => context.links.some((link) => link.targetType === "finding" && link.targetId === selectedFinding.id))
    : [];
  const selectedRiskContext =
    selectedRiskContexts.find((context) => context.risk.id === selectedRiskId) ?? selectedRiskContexts[0] ?? null;
  const selectedTasks = selectedFinding ? tasks.filter((task) => task.findingId === selectedFinding.id) : [];
  const selectedTask =
    selectedTasks.find((task) => task.id === selectedTaskId) ?? selectedTasks[0] ?? null;
  const selectedAcceptance = selectedTask
    ? acceptanceContexts.find((context) => context.task.id === selectedTask.id)?.acceptance ?? null
    : null;

  return (
    <AppShell session={session} title="Risk & Acceptance">
      {apiError ? <ErrorState title="Risk workspace could not be loaded" detail={apiError} /> : null}
      {!apiError ? (
        <>
          <RiskDashboard findings={findings} risks={risks} tasks={tasks} acceptances={acceptanceContexts} selectedFinding={selectedFinding} />
          <FindingEscalationQueue
            findings={findings}
            assessments={assessments}
            riskContexts={riskContexts}
            tasks={tasks}
            selectedFinding={selectedFinding}
          />
          {selectedFinding && selectedTarget.item ? (
            <>
              <SelectedFindingContext
                finding={selectedFinding}
                assessment={selectedTarget.assessment}
                item={selectedTarget.item}
                question={selectedQuestion}
              />
              <RiskDecisionWorkspace
                finding={selectedFinding}
                assessment={selectedTarget.assessment}
                item={selectedTarget.item}
                riskModels={riskModels}
                risks={selectedRiskContexts}
                selectedRisk={selectedRiskContext}
                question={selectedQuestion}
                tasks={selectedTasks}
                acceptances={acceptanceContexts.filter((context) => selectedTasks.some((task) => task.id === context.task.id))}
                selectedTask={selectedTask}
                selectedAcceptance={selectedAcceptance}
                evidenceContexts={evidenceContexts}
                taskReviews={taskReviewContexts.find((context) => context.task.id === selectedTask?.id)?.reviews ?? []}
                currentUserId={session.userId}
                canWriteRisk={canWriteRisk}
                canWriteRemediation={canWriteRemediation}
                canReview={canReviewAssessment(session)}
                workflowMode={workflowMode}
                workflowChoice={workflowChoice}
              />
            </>
          ) : (
            <EmptyState
              title="No finding selected"
              detail="Open a finding from the queue to escalate it into a risk, define a mitigation plan, or record a time-bound acceptance."
            />
          )}
        </>
      ) : null}
    </AppShell>
  );
}

function RiskDashboard({
  findings,
  risks,
  tasks,
  acceptances,
  selectedFinding
}: {
  findings: Finding[];
  risks: Risk[];
  tasks: RemediationTask[];
  acceptances: AcceptanceContext[];
  selectedFinding: Finding | null;
}) {
  const activeAcceptances = acceptances.filter(({ acceptance }) => acceptance?.active).length;
  const inactiveAcceptances = acceptances.filter(({ acceptance }) => acceptance && !acceptance.active).length;
  const openTasks = tasks.filter((task) => task.status === "open" || task.status === "in_progress").length;
  return (
    <section className="workspace" aria-labelledby="risk-dashboard-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Phase 11</p>
          <h2 id="risk-dashboard-heading">Finding to risk to acceptance</h2>
        </div>
        <span>{selectedFinding ? "Finding selected" : "Select a finding"}</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Findings</span>
          <strong>{findings.length}</strong>
          <small>Control gaps ready to assess for risk escalation.</small>
        </article>
        <article>
          <span className="label">Enterprise risks</span>
          <strong>{risks.length}</strong>
          <small>Risks linked to findings, controls, or other domain objects.</small>
        </article>
        <article>
          <span className="label">Open mitigation work</span>
          <strong>{openTasks}</strong>
          <small>Remediation tasks that are still open or in progress.</small>
        </article>
        <article>
          <span className="label">Active acceptances</span>
          <strong>{activeAcceptances}</strong>
          <small>Time-bound acceptances with future expiry and review dates.</small>
        </article>
        <article>
          <span className="label">Expired or review-due</span>
          <strong>{inactiveAcceptances}</strong>
          <small>Acceptances surfaced as no longer active by the backend rule.</small>
        </article>
        <article>
          <span className="label">Workflow rule</span>
          <p>Risk acceptance needs a named approver, rationale, expiry date, and next review date.</p>
        </article>
      </div>
    </section>
  );
}

function FindingEscalationQueue({
  findings,
  assessments,
  riskContexts,
  tasks,
  selectedFinding
}: {
  findings: Finding[];
  assessments: Assessment[];
  riskContexts: RiskContext[];
  tasks: RemediationTask[];
  selectedFinding: Finding | null;
}) {
  const linkedRiskCount = (finding: Finding) =>
    riskContexts.filter((context) => context.links.some((link) => link.targetType === "finding" && link.targetId === finding.id)).length;
  return (
    <section className="workspace" aria-labelledby="risk-queue-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Finding queue</p>
          <h2 id="risk-queue-heading">Escalate reviewed findings</h2>
        </div>
        <span>{findings.length} findings</span>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Findings available for risk assessment</caption>
          <thead>
            <tr>
              <th scope="col">Assessment</th>
              <th scope="col">Control</th>
              <th scope="col">Severity</th>
              <th scope="col">Impact</th>
              <th scope="col">Likelihood</th>
              <th scope="col">Due date</th>
              <th scope="col">Risk link</th>
              <th scope="col">Task</th>
              <th scope="col">Action</th>
            </tr>
          </thead>
          <tbody>
            {findings.length === 0 ? (
              <tr>
                <td colSpan={9}>No findings exist yet. Create findings from an approved assessment first.</td>
              </tr>
            ) : (
              findings.map((finding) => {
                const target = findingTarget(assessments, finding);
                const findingTasks = tasks.filter((task) => task.findingId === finding.id);
                return (
                  <tr key={finding.id}>
                    <td>{target.assessment?.scopeName ?? "Assessment unavailable"}</td>
                    <td>{target.item?.controlRef.controlId ?? "Control unavailable"}</td>
                    <td><span className="badge confidential">{finding.severity}</span></td>
                    <td>{finding.impact ?? "Not set"}</td>
                    <td>{finding.likelihood ?? "Not set"}</td>
                    <td>{finding.dueAt ? formatDateTime(finding.dueAt) : "Not set"}</td>
                    <td>{linkedRiskCount(finding)} risk{linkedRiskCount(finding) === 1 ? "" : "s"}</td>
                    <td>{findingTasks[0]?.status ?? "No task"}</td>
                    <td>
                      <Link className="reviewLink" href={`/risks?findingId=${finding.id}`}>
                        {selectedFinding?.id === finding.id ? "Selected" : "Open risk plan"}
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SelectedFindingContext({
  finding,
  assessment,
  item,
  question
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
}) {
  return (
    <section className="workspace" aria-labelledby="risk-context-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Selected finding</p>
          <h2 id="risk-context-heading">{assessment?.scopeName ?? "Assessment context unavailable"}</h2>
        </div>
        <span>{finding.severity}</span>
      </div>
      <div className="ownerQuestionPanel">
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
              {frameworkLabelsFromQuestion(question, item).map((framework) => <span key={framework}>{framework}</span>)}
            </div>
          </article>
          <article>
            <span className="label">Harmonized control</span>
            <strong>{question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? "Unknown"}</strong>
            <small>{question?.harmonizedControlName ?? "Control context unavailable"}</small>
          </article>
          <article>
            <span className="label">Source control</span>
            <strong>{question?.controlId ?? item.controlRef.controlId}</strong>
            <small>{question?.controlTitle ?? "Mapped source control"}</small>
          </article>
          <article className="wideArticle">
            <span className="label">Finding description</span>
            <p>{finding.description}</p>
          </article>
          <article className="wideArticle">
            <span className="label">Answer reviewed</span>
            <p>{item.answerText ?? "No submitted answer was available when this finding was created."}</p>
          </article>
        </div>
      </div>
    </section>
  );
}

function RiskDecisionWorkspace({
  finding,
  assessment,
  item,
  question,
  riskModels,
  risks,
  selectedRisk,
  tasks,
  acceptances,
  selectedTask,
  selectedAcceptance,
  evidenceContexts,
  taskReviews,
  currentUserId,
  canWriteRisk,
  canWriteRemediation,
  canReview,
  workflowMode,
  workflowChoice
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  riskModels: RiskModel[];
  risks: RiskContext[];
  selectedRisk: RiskContext | null;
  tasks: RemediationTask[];
  acceptances: AcceptanceContext[];
  selectedTask: RemediationTask | null;
  selectedAcceptance: RiskAcceptance | null;
  evidenceContexts: EvidenceContext[];
  taskReviews: RemediationTaskReview[];
  currentUserId: string;
  canWriteRisk: boolean;
  canWriteRemediation: boolean;
  canReview: boolean;
  workflowMode: string;
  workflowChoice: string;
}) {
  const selectedTaskEvidence = selectedTask ? evidenceForTask(evidenceContexts, selectedTask.id) : [];
  const originalEvidence = evidenceForAssessmentItem(evidenceContexts, item.id);
  const selectedTreatment = selectedRisk?.treatments[0] ?? null;
  const selectedMode = workflowMode === "remediate" || workflowMode === "review" ? workflowMode : "";
  const selectedChoice = workflowChoice === "remediate" || workflowChoice === "accept" ? workflowChoice : "";
  const hasSubmission = Boolean(selectedTask && taskHasSubmission(selectedTask, selectedTaskEvidence, selectedAcceptance, taskReviews));
  return (
    <section className="workspace" aria-labelledby="risk-decision-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Risk and acceptance</p>
          <h2 id="risk-decision-heading">Mitigation plan, residual risk, and time-bound acceptance</h2>
        </div>
        <span>{risks.length} linked risks</span>
      </div>
      <RiskRegister
        risks={risks}
        finding={finding}
        tasks={tasks}
        acceptances={acceptances}
        evidenceContexts={evidenceContexts}
        selectedRisk={selectedRisk}
      />
      {!selectedRisk ? (
        <div className="workflowGrid">
          {canWriteRisk && assessment ? (
          <RiskAiAssistForm
            actionPath={risksActionPath}
            assessmentId={assessment.id}
            finding={finding}
            item={item}
            riskModels={riskModels}
            currentUserId={currentUserId}
          />
          ) : canWriteRisk ? (
            <div className="constraintNote">Assessment context is unavailable, so this finding cannot be analyzed or escalated safely.</div>
          ) : (
            <div className="constraintNote">Your role can view risks but cannot create or link new enterprise risks.</div>
          )}
        </div>
      ) : null}
      {selectedRisk && !selectedTask ? (
        <div className="constraintNote">
          This risk is linked, but no mitigation task exists yet. New risks created from this page now create the mitigation task automatically;
          older partial records need backend repair before remediation can start.
        </div>
      ) : null}
      {selectedRisk && selectedTask ? (
        <div className="selectedRiskWorkspace">
          <SelectedRiskSummary risk={selectedRisk.risk} treatment={selectedTreatment} task={selectedTask} acceptance={selectedAcceptance} />
          {!selectedMode ? (
            <RiskNextActionPanel
              finding={finding}
              risk={selectedRisk.risk}
              task={selectedTask}
              acceptance={selectedAcceptance}
              hasSubmission={hasSubmission}
              reviews={taskReviews}
              canWriteRemediation={canWriteRemediation}
            />
          ) : null}
          {selectedMode === "remediate" ? (
            <RemediationChoiceWorkspace
              finding={finding}
              assessment={assessment}
              item={item}
              question={question}
              risk={selectedRisk.risk}
              task={selectedTask}
              treatment={selectedTreatment}
              originalEvidence={originalEvidence}
              evidenceContexts={evidenceContexts}
              linkedEvidence={selectedTaskEvidence}
              reviews={taskReviews}
              acceptance={selectedAcceptance}
              currentUserId={currentUserId}
              canWriteRemediation={canWriteRemediation}
              choice={selectedChoice}
            />
          ) : null}
          {selectedMode === "review" ? (
            <RemediationReviewFlow
              finding={finding}
              assessment={assessment}
              item={item}
              question={question}
              risk={selectedRisk.risk}
              task={selectedTask}
              treatment={selectedTreatment}
              originalEvidence={originalEvidence}
              linkedEvidence={selectedTaskEvidence}
              reviews={taskReviews}
              acceptance={selectedAcceptance}
              canWriteRemediation={canWriteRemediation}
              canReview={canReview}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function SelectedRiskSummary({
  risk,
  treatment,
  task,
  acceptance
}: {
  risk: Risk;
  treatment: RiskTreatment | null;
  task: RemediationTask;
  acceptance: RiskAcceptance | null;
}) {
  return (
    <div className="questionCardGrid" aria-label="Selected linked risk summary">
      <article className="metricCard">
        <span className="label">Risk</span>
        <strong>{risk.riskKey}</strong>
        <p>{risk.title}</p>
      </article>
      <article className="metricCard">
        <span className="label">Risk posture</span>
        <strong>{risk.category}</strong>
        <p>Inherent {risk.inherentScore} / Residual {risk.residualScore}</p>
      </article>
      <article className="metricCard">
        <span className="label">Mitigation task</span>
        <strong>{task.status.replaceAll("_", " ")}</strong>
        <p>Due {formatDateTime(task.dueAt)}</p>
      </article>
      <article className="metricCard">
        <span className="label">Treatment</span>
        <strong>{treatment?.strategy ?? "not planned"}</strong>
        <p>{treatment ? treatment.plan : "Treatment plan was not created for this linked risk."}</p>
      </article>
      <article className="metricCard">
        <span className="label">Risk acceptance</span>
        <strong>{acceptance ? acceptanceStatus(acceptance) : "not requested"}</strong>
        <p>{acceptance ? `Expires ${formatDateTime(acceptance.expiresAt)}` : "Use only when remediation is not the chosen path."}</p>
      </article>
    </div>
  );
}

function RiskNextActionPanel({
  finding,
  risk,
  task,
  acceptance,
  hasSubmission,
  reviews,
  canWriteRemediation
}: {
  finding: Finding;
  risk: Risk;
  task: RemediationTask;
  acceptance: RiskAcceptance | null;
  hasSubmission: boolean;
  reviews: RemediationTaskReview[];
  canWriteRemediation: boolean;
}) {
  const isResolved = task.status === "verified" || task.status === "risk_accepted";
  const needsResubmission = taskIsAwaitingResubmission(task, reviews);

  // After rejection: owner must update and re-submit — route to remediate workspace
  const label = isResolved
    ? "View Remediation"
    : needsResubmission
      ? "Update Remediation"
      : hasSubmission
        ? "View Remediation"
        : "Remediation";
  const mode = isResolved || (hasSubmission && !needsResubmission) ? "review" : "remediate";
  const detail = isResolved
    ? "This risk path has a reviewed outcome. Open the remediation record for audit history."
    : needsResubmission
      ? "Your remediation was rejected. Update your answer and evidence, then resubmit."
      : hasSubmission || acceptance
        ? "A remediation or risk acceptance record is waiting for review. Open it instead of starting another path."
        : "Choose remediation or risk acceptance in the focused workspace.";
  return (
    <article className="subWorkspace">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Next step</p>
          <h3>{label}</h3>
        </div>
        <span className="badge internal">{task.status.replaceAll("_", " ")}</span>
      </div>
      <div className="subWorkspaceContent">
        <p>{detail}</p>
        {canWriteRemediation ? (
          <div className="actionRow">
            <Link className="reviewLink" href={`/risks?findingId=${finding.id}&riskId=${risk.id}&taskId=${task.id}&mode=${mode}`}>
              {label}
            </Link>
          </div>
        ) : (
          <div className="constraintNote">Your role can view this risk path but cannot submit or review remediation work.</div>
        )}
      </div>
    </article>
  );
}

function RemediationChoiceWorkspace({
  finding,
  assessment,
  item,
  question,
  risk,
  task,
  treatment,
  originalEvidence,
  evidenceContexts,
  linkedEvidence,
  reviews,
  acceptance,
  currentUserId,
  canWriteRemediation,
  choice
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  risk: Risk;
  task: RemediationTask;
  treatment: RiskTreatment | null;
  originalEvidence: EvidenceContext[];
  evidenceContexts: EvidenceContext[];
  linkedEvidence: EvidenceContext[];
  reviews: RemediationTaskReview[];
  acceptance: RiskAcceptance | null;
  currentUserId: string;
  canWriteRemediation: boolean;
  choice: string;
}) {
  const hasSubmission = taskHasSubmission(task, linkedEvidence, acceptance, reviews);
  const needsResubmission = taskIsAwaitingResubmission(task, reviews);
  // After rejection: allow the owner to update their submission — do NOT lock
  if (!needsResubmission && (task.status === "verified" || task.status === "risk_accepted" || hasSubmission)) {
    return (
      <article className="subWorkspace">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Remediation locked</p>
            <h3>Submission is already in review or resolved</h3>
          </div>
          <span>{task.status.replaceAll("_", " ")}</span>
        </div>
        <p>Open the remediation record instead of starting a second path for the same attempt.</p>
        <Link className="reviewLink" href={`/risks?findingId=${finding.id}&riskId=${risk.id}&taskId=${task.id}&mode=review`}>
          View Remediation
        </Link>
      </article>
    );
  }
  return (
    <section className="subWorkspace" aria-labelledby="remediation-choice-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Remediation workspace</p>
          <h3 id="remediation-choice-heading">Choose one path</h3>
        </div>
        <span>one choice only</span>
      </div>
      <WorkflowContextSummary
        finding={finding}
        assessment={assessment}
        item={item}
        question={question}
        risk={risk}
        task={task}
        treatment={treatment}
        originalEvidence={originalEvidence}
      />
      {!canWriteRemediation ? (
        <div className="constraintNote">Your role can view this risk path but cannot submit remediation or acceptance requests.</div>
      ) : !choice ? (
        <div className="workflowGrid">
          <article className="miniForm">
            <h3>Remediate the Risk</h3>
            <p>Use this when the team has fixed the gap and can submit a better answer plus new evidence.</p>
            <Link className="reviewLink" href={`/risks?findingId=${finding.id}&riskId=${risk.id}&taskId=${task.id}&mode=remediate&choice=remediate`}>
              Remediate the Risk
            </Link>
          </article>
          <article className="miniForm">
            <h3>Accept the Risk</h3>
            <p>Use this when residual risk should be formally accepted for a time-bound period instead of remediated now.</p>
            <Link className="reviewLink" href={`/risks?findingId=${finding.id}&riskId=${risk.id}&taskId=${task.id}&mode=remediate&choice=accept`}>
              Accept the Risk
            </Link>
          </article>
        </div>
      ) : choice === "remediate" ? (
        <RemediationSubmissionForm
          finding={finding}
          assessment={assessment}
          item={item}
          question={question}
          risk={risk}
          task={task}
          originalEvidence={originalEvidence}
          evidenceContexts={evidenceContexts}
          currentUserId={currentUserId}
        />
      ) : (
        <RiskAcceptanceChoiceForm finding={finding} risk={risk} task={task} />
      )}
    </section>
  );
}

function RemediationSubmissionForm({
  finding,
  assessment,
  item,
  question,
  risk,
  task,
  originalEvidence,
  evidenceContexts,
  currentUserId
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  risk: Risk;
  task: RemediationTask;
  originalEvidence: EvidenceContext[];
  evidenceContexts: EvidenceContext[];
  currentUserId: string;
}) {
  const scopeTags = remediationScopeTags(item, question);
  const otherEvidence = evidenceContexts.filter(
    (e) => !originalEvidence.some((o) => o.object.id === e.object.id)
  );

  return (
    <form className="miniForm" action={risksActionPath} method="post" encType="multipart/form-data" aria-label="Submit remediation">
      <input type="hidden" name="intent" value="submitRemediation" />
      <input type="hidden" name="findingId" value={finding.id} />
      <input type="hidden" name="riskId" value={risk.id} />
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="ownerId" value={currentUserId} />
      <input type="hidden" name="mode" value="review" />
      <HiddenIdempotency />
      <h3>Submit remediation for review</h3>
      <p>The original answer is preserved. Select existing evidence files, upload new files, or both.</p>
      <label>
        Original answer
        <textarea value={item.answerText ?? "No original answer submitted."} readOnly />
      </label>
      <label>
        Updated / Remediation Answer
        <textarea
          name="remediationAnswer"
          required
          minLength={20}
          placeholder="Explain what has now been fixed, improved, or implemented."
        />
      </label>

      {originalEvidence.length > 0 || otherEvidence.length > 0 ? (
        <fieldset className="evidenceSelectionSection">
          <legend className="label">Choose from previously submitted evidence files</legend>

          {originalEvidence.length > 0 ? (
            <div className="evidenceSelectGroup">
              <span className="evidenceSelectGroupHeader">Originally submitted for this item</span>
              {originalEvidence.map(({ object, version }) =>
                version ? (
                  <label key={version.id} className="evidenceSelectItem">
                    <input type="checkbox" name="existingEvidenceVersionIds" value={version.id} />
                    <div className="evidenceSelectItemContent">
                      <span className="evidenceSelectItemTitle">{evidenceFileName(object, version)}</span>
                      <div className="evidenceItemMeta">
                        <span className="evidenceBadge original">Item evidence</span>
                        <span>Uploaded {formatDateTime(object.createdAt)}</span>
                        {object.classification ? <span className="evidenceBadge">{object.classification}</span> : null}
                      </div>
                    </div>
                  </label>
                ) : null
              )}
            </div>
          ) : null}

          {otherEvidence.length > 0 ? (
            <div className="evidenceSelectGroup">
              <span className="evidenceSelectGroupHeader">Other workspace evidence files</span>
              {otherEvidence.map(({ object, version }) =>
                version ? (
                  <label key={version.id} className="evidenceSelectItem">
                    <input type="checkbox" name="existingEvidenceVersionIds" value={version.id} />
                    <div className="evidenceSelectItemContent">
                      <span className="evidenceSelectItemTitle">{evidenceFileName(object, version)}</span>
                      <div className="evidenceItemMeta">
                        <span className="evidenceBadge">Workspace file</span>
                        <span>Uploaded {formatDateTime(object.createdAt)}</span>
                        {object.classification ? <span className="evidenceBadge">{object.classification}</span> : null}
                      </div>
                    </div>
                  </label>
                ) : null
              )}
            </div>
          ) : null}
        </fieldset>
      ) : null}

      <label>
        Upload new evidence files (Select one or multiple)
        <input name="files" type="file" multiple />
      </label>
      <input type="hidden" name="classification" value="restricted" />
      <label>
        Period start
        <input type="date" name="periodStart" defaultValue={dateInputValue(assessment?.periodStart)} />
      </label>
      <label>
        Period end
        <input type="date" name="periodEnd" defaultValue={dateInputValue(assessment?.periodEnd)} />
      </label>
      <label>
        Scope tags
        <input name="scopeTags" defaultValue={scopeTags.join(", ")} />
      </label>
      <label>
        Due date
        <input type="date" name="dueAt" defaultValue={dateInputValue(task.dueAt)} />
      </label>
      <div className="constraintNote">Providing additional evidence files is optional. You can select previously submitted files, upload new files, or submit answer text only.</div>
      <button type="submit">Submit remediation for review</button>
    </form>
  );
}

function RemediationReviewFlow({
  finding,
  assessment,
  item,
  question,
  risk,
  task,
  treatment,
  originalEvidence,
  linkedEvidence,
  reviews,
  acceptance,
  canWriteRemediation,
  canReview
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  risk: Risk;
  task: RemediationTask;
  treatment: RiskTreatment | null;
  originalEvidence: EvidenceContext[];
  linkedEvidence: EvidenceContext[];
  reviews: RemediationTaskReview[];
  acceptance: RiskAcceptance | null;
  canWriteRemediation: boolean;
  canReview: boolean;
}) {
  return (
    <div className="reviewFlowContainer">
      <WorkflowContextSummary
        finding={finding}
        assessment={assessment}
        item={item}
        question={question}
        risk={risk}
        task={task}
        treatment={treatment}
        originalEvidence={originalEvidence}
      />
      {acceptance ? <RiskAcceptanceSummary task={task} risk={risk} acceptance={acceptance} canReview={canReview} /> : null}
      <section className="subWorkspace" aria-labelledby="remediation-evidence-review-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Submitted remediation</p>
            <h3 id="remediation-evidence-review-heading">Answer and evidence history</h3>
          </div>
          <span className="badge internal">{linkedEvidence.length} files</span>
        </div>
        <EvidenceTable title="New remediation evidence" evidence={linkedEvidence} emptyText="No remediation evidence has been submitted for this task." />
      </section>
      {canReview && task.status !== "verified" && task.status !== "risk_accepted" ? (
        <RemediationReviewAiAssistForm
          assessmentName={assessment?.scopeName ?? "Assessment context unavailable"}
          itemId={item.id}
          questionText={question?.questionText ?? "Question catalog entry unavailable"}
          responseType={question?.responseType}
          originalAnswer={item.answerText ?? ""}
          findingDescription={finding.description}
          findingSeverity={finding.severity}
          riskKey={risk.riskKey}
          riskTitle={risk.title}
          riskCategory={risk.category}
          riskStatus={risk.status}
          taskStatus={task.status}
          acceptanceRationale={acceptance?.rationale}
          acceptanceExpiresAt={acceptance?.expiresAt}
          acceptanceNextReviewDueAt={acceptance?.nextReviewDueAt}
          frameworkKeys={frameworkLabelsFromQuestion(question, item)}
          harmonizedControlId={question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? undefined}
          harmonizedControlName={question?.harmonizedControlName ?? undefined}
          sourceControlId={question?.controlId ?? item.controlRef.controlId}
          sourceControlTitle={question?.controlTitle ?? undefined}
          evidenceExpectationIds={question?.evidenceExpectationIds ?? []}
          citations={(question?.citations ?? [])
            .map((citation) => ({
              sourceId: typeof citation.sourceId === "string" ? citation.sourceId : "",
              sourceType: typeof citation.sourceType === "string" ? citation.sourceType : undefined
            }))
            .filter((citation) => citation.sourceId.length > 0)}
          evidenceObjectIds={[...new Set([...originalEvidence, ...linkedEvidence].map((entry) => entry.object.id))]}
          remediationEvidenceNames={linkedEvidence.map((entry) => entry.object.fileName)}
        />
      ) : null}
      {canReview ? (
        <RemediationReviewWorkspace
          finding={finding}
          risk={risk}
          task={task}
          linkedEvidence={linkedEvidence}
          reviews={reviews}
          canReview={canReview && task.status !== "verified" && task.status !== "risk_accepted" && linkedEvidence.length > 0}
        />
      ) : null}
      <ClosureReadiness task={task} risk={risk} acceptance={acceptance} assessment={assessment} canReview={canReview} />
    </div>
  );
}

function WorkflowContextSummary({
  finding,
  assessment,
  item,
  question,
  risk,
  task,
  treatment,
  originalEvidence
}: {
  finding: Finding;
  assessment: Assessment | null;
  item: AssessmentItem;
  question: AssessmentQuestionOption | null;
  risk: Risk;
  task: RemediationTask;
  treatment: RiskTreatment | null;
  originalEvidence: EvidenceContext[];
}) {
  return (
    <div className="ownerQuestionPanel">
      <article className="ownerQuestionHero">
        <div>
          <span className="label">Assessment</span>
          <h3>{assessment?.scopeName ?? "Assessment context unavailable"}</h3>
          <p>{question?.questionText ?? "Question catalog entry unavailable"}</p>
        </div>
        <span className="badge internal">{task.status.replaceAll("_", " ")}</span>
      </article>
      <div className="ownerQuestionCards">
        <article>
          <span className="label">Original answer</span>
          <p>{item.answerText ?? "No answer was submitted before this finding was created."}</p>
        </article>
        <article>
          <span className="label">Finding</span>
          <p>{finding.description}</p>
        </article>
        <article>
          <span className="label">Risk</span>
          <strong>{risk.riskKey}</strong>
          <small>{risk.title}</small>
        </article>
        <article>
          <span className="label">Control</span>
          <strong>{question?.controlId ?? item.controlRef.controlId}</strong>
          <small>{question?.controlTitle ?? "Mapped source control"}</small>
        </article>
        <article>
          <span className="label">Harmonized control</span>
          <strong>{question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? "Unknown"}</strong>
          <small>{question?.harmonizedControlName ?? "Control context unavailable"}</small>
        </article>
        <article>
          <span className="label">Frameworks</span>
          <div className="tagList compactTagList">
            {frameworkLabelsFromQuestion(question, item).map((framework) => <span key={framework}>{framework}</span>)}
          </div>
        </article>
        <article>
          <span className="label">Due date</span>
          <strong>{formatDateTime(task.dueAt)}</strong>
          <small>{treatment ? treatment.plan : "No treatment plan was saved."}</small>
        </article>
      </div>
      <EvidenceTable title="Original submitted evidence" evidence={originalEvidence} emptyText="No original evidence was attached to the assessment answer." />
    </div>
  );
}


function RiskAcceptanceChoiceForm({ finding, risk, task }: { finding: Finding; risk: Risk; task: RemediationTask }) {
  return (
    <form className="miniForm" action={risksActionPath} method="post" aria-label="Submit risk acceptance">
      <input type="hidden" name="intent" value="acceptRisk" />
      <input type="hidden" name="findingId" value={finding.id} />
      <input type="hidden" name="riskId" value={risk.id} />
      <input type="hidden" name="taskId" value={task.id} />
      <input type="hidden" name="mode" value="review" />
      <HiddenIdempotency />
      <h3>Accept residual risk</h3>
      <p>Use this instead of remediation. Acceptance requires a meaningful explanation, expiry date, and next review date.</p>
      <label>
        Why should this risk be accepted?
        <textarea
          name="reason"
          required
          minLength={40}
          placeholder="Example: The affected legacy application will be decommissioned within 60 days, exposure is segmented, and compensating monitoring is in place."
        />
      </label>
      <label>
        Expires at
        <input type="date" name="expiresAt" defaultValue={dateDaysFromNow(90)} />
      </label>
      <label>
        Next review due
        <input type="date" name="nextReviewDueAt" defaultValue={dateDaysFromNow(45)} />
      </label>
      <label>
        Compensating controls
        <textarea name="compensatingControls" placeholder="List compensating controls, monitoring, segmentation, decommission plan, or other guardrails." />
      </label>
      <button type="submit">Submit risk acceptance</button>
    </form>
  );
}

function RiskAcceptanceSummary({
  task,
  risk,
  acceptance,
  canReview
}: {
  task: RemediationTask;
  risk: Risk;
  acceptance: RiskAcceptance;
  canReview: boolean;
}) {
  return (
    <section className="subWorkspace" aria-labelledby="risk-acceptance-summary-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Risk acceptance</p>
          <h3 id="risk-acceptance-summary-heading">Time-bound acceptance record</h3>
        </div>
        <span>{acceptanceStatus(acceptance)}</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Rationale</span>
          <p>{acceptance.rationale}</p>
        </article>
        <article>
          <span className="label">Expiry</span>
          <strong>{formatDateTime(acceptance.expiresAt)}</strong>
          <small>Next review {formatDateTime(acceptance.nextReviewDueAt)}</small>
        </article>
        <article>
          <span className="label">Compensating controls</span>
          <p>{acceptance.compensatingControls ?? "No compensating controls recorded."}</p>
        </article>
      </div>
      {canReview && task.status !== "verified" ? (
        <form className="miniForm" action={risksActionPath} method="post" aria-label="Review risk acceptance">
          <input type="hidden" name="intent" value="reviewAcceptance" />
          <input type="hidden" name="findingId" value={task.findingId} />
          <input type="hidden" name="taskId" value={task.id} />
          <input type="hidden" name="riskId" value={risk.id} />
          <input type="hidden" name="mode" value="review" />
          <HiddenIdempotency />
          <label>
            Decision
            <select name="decision" defaultValue={acceptance.active ? "reaffirmed" : "escalated"}>
              <option value="reaffirmed">Approve Risk Acceptance</option>
              <option value="escalated">Reject Risk Acceptance</option>
              <option value="revoked">Revoke Acceptance</option>
            </select>
          </label>
          <label>
            Review reason
            <textarea name="reason" required defaultValue={acceptance.active ? "Acceptance remains valid for the approved period." : "Acceptance requires additional review before it can remain active."} />
          </label>
          <button type="submit">Record acceptance review</button>
        </form>
      ) : null}
    </section>
  );
}

function EvidenceTable({ title, evidence, emptyText }: { title: string; evidence: EvidenceContext[]; emptyText: string }) {
  return (
    <div className="tableScroller">
      <table>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">File</th>
            <th scope="col">Uploaded</th>
            <th scope="col">State</th>
            <th scope="col">Hash</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {evidence.length === 0 ? (
            <tr>
              <td colSpan={5}>{emptyText}</td>
            </tr>
          ) : (
            evidence.map(({ object, version }) => (
              <tr key={object.id}>
                <td>
                  <strong>{evidenceFileName(object, version)}</strong>
                  <small>{object.scopeTags.join(", ") || "No scope tags"}</small>
                </td>
                <td>{formatDateTime(object.createdAt)}</td>
                <td><span className="badge internal">{object.state}</span></td>
                <td>{version?.sha256 ? version.sha256.slice(0, 24) : object.sha256 ? object.sha256.slice(0, 24) : "Not committed"}</td>
                <td>
                  <Link className="reviewLink" href={`/api/backend/v1/evidence/objects/${object.id}/download`} target="_blank" rel="noreferrer">
                    View file
                  </Link>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function RemediationReviewWorkspace({
  finding,
  risk,
  task,
  linkedEvidence,
  reviews,
  canReview
}: {
  finding: Finding;
  risk: Risk | null;
  task: RemediationTask;
  linkedEvidence: EvidenceContext[];
  reviews: RemediationTaskReview[];
  canReview: boolean;
}) {
  const linkedVersionIds = linkedEvidence.map((entry) => entry.version?.id).filter((value): value is string => Boolean(value));
  return (
    <section className="subWorkspace" aria-labelledby="remediation-review-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Reviewer decision</p>
          <h3 id="remediation-review-heading">Approve or reject mitigation work</h3>
        </div>
        <span>{reviews.length} decisions</span>
      </div>
      <div className="tableScroller">
        <table>
          <caption>Remediation review history</caption>
          <thead>
            <tr>
              <th scope="col">Decision</th>
              <th scope="col">Rationale</th>
              <th scope="col">Evidence reviewed</th>
              <th scope="col">Reviewed</th>
            </tr>
          </thead>
          <tbody>
            {reviews.length === 0 ? (
              <tr>
                <td colSpan={4}>No remediation review decision has been recorded yet.</td>
              </tr>
            ) : (
              reviews.map((review) => (
                <tr key={review.id}>
                  <td><span className="badge internal">{review.decision}</span></td>
                  <td>{review.rationale}</td>
                  <td>{review.evidenceVersionIds.length}</td>
                  <td>{formatDateTime(review.reviewedAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {canReview ? (
        <div className="workflowGrid">
          <form className="miniForm" action={risksActionPath} method="post" aria-label="Approve remediation">
            <input type="hidden" name="intent" value="reviewRemediationTask" />
            <input type="hidden" name="findingId" value={finding.id} />
            <input type="hidden" name="taskId" value={task.id} />
            {risk ? <input type="hidden" name="riskId" value={risk.id} /> : null}
            <input type="hidden" name="decision" value="approved" />
            <input type="hidden" name="evidenceVersionIds" value={linkedVersionIds.join(",")} />
            <HiddenIdempotency />
            <h3>Approve mitigation</h3>
            <p>Use this only after the reviewer verifies the answer, mitigation plan, and linked remediation evidence.</p>
            <label>
              Approval note
              <textarea name="rationale" defaultValue="Mitigation evidence has been reviewed and the remediation task is verified." />
            </label>
            <button type="submit">Approve and verify task</button>
          </form>
          <form className="miniForm" action={risksActionPath} method="post" aria-label="Reject remediation">
            <input type="hidden" name="intent" value="reviewRemediationTask" />
            <input type="hidden" name="findingId" value={finding.id} />
            <input type="hidden" name="taskId" value={task.id} />
            {risk ? <input type="hidden" name="riskId" value={risk.id} /> : null}
            <input type="hidden" name="decision" value="rejected" />
            <input type="hidden" name="evidenceVersionIds" value={linkedVersionIds.join(",")} />
            <HiddenIdempotency />
            <h3>Reject and send back</h3>
            <p>The task returns to in progress so the owner can improve the answer, add evidence, or request risk acceptance.</p>
            <label>
              Rejection reason
              <textarea name="rationale" defaultValue="Remediation evidence is incomplete. Please upload updated proof and resubmit for verification." />
            </label>
            <button type="submit">Reject mitigation</button>
          </form>
        </div>
      ) : (
        <div className="constraintNote">Remediation verification and review decisions are reserved for Auditors and Platform Admins.</div>
      )}
    </section>
  );
}

function ClosureReadiness({
  task,
  risk,
  acceptance,
  assessment,
  canReview
}: {
  task: RemediationTask;
  risk: Risk | null;
  acceptance: RiskAcceptance | null;
  assessment: Assessment | null;
  canReview: boolean;
}) {
  const remediationApproved = task.status === "verified";
  const riskAcceptanceApproved = task.status === "risk_accepted" && Boolean(acceptance?.active);
  const ready = remediationApproved || riskAcceptanceApproved;
  return (
    <section className="subWorkspace" aria-labelledby="closure-readiness-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Closure readiness</p>
          <h3 id="closure-readiness-heading">When the assessment can be closed</h3>
        </div>
        <span>{ready ? "Ready" : "Not ready"}</span>
      </div>
      <div className="closureReadinessGrid">
        <article className="closureCard">
          <span className="label">Risk</span>
          <strong>{risk ? risk.status : "No linked risk"}</strong>
          <small>{risk ? risk.title : "Create or link a risk when escalation is warranted."}</small>
        </article>
        <article className="closureCard">
          <span className="label">Mitigation task</span>
          <strong>{task.status.replaceAll("_", " ")}</strong>
          <small>{ready ? "Reviewer has verified remediation or approved risk acceptance." : "Awaiting remediation review approval or risk acceptance approval."}</small>
        </article>
        <article className="closureCard">
          <span className="label">Risk acceptance</span>
          <strong>{acceptance ? acceptanceStatus(acceptance) : "Not recorded"}</strong>
          <small>{acceptance ? `Expires ${formatDateTime(acceptance.expiresAt)}` : "Only needed when residual risk is accepted instead of remediated."}</small>
        </article>
        <article className="closureCard">
          <span className="label">Assessment closure</span>
          {ready && assessment && canReview ? (
            <>
              <p>Remediation or risk acceptance is approved. Go to Assessment Review to approve all items and close the assessment.</p>
              <Link
                className="reviewLink"
                href={`/assessments/review?assessmentId=${assessment.id}`}
              >
                Go to Assessment Review
              </Link>
            </>
          ) : ready ? (
            <p>Remediation or risk acceptance is approved. An auditor or platform admin can now review and close the assessment.</p>
          ) : (
            <p>Assessment closure is available after remediation is approved by a reviewer or risk acceptance is approved.</p>
          )}
        </article>
      </div>
    </section>
  );
}

function RiskRegister({
  risks,
  finding,
  tasks,
  acceptances,
  evidenceContexts,
  selectedRisk
}: {
  risks: RiskContext[];
  finding: Finding;
  tasks: RemediationTask[];
  acceptances: AcceptanceContext[];
  evidenceContexts: EvidenceContext[];
  selectedRisk: RiskContext | null;
}) {
  const acceptanceByTask = new Map(acceptances.map((entry) => [entry.task.id, entry.acceptance]));
  return (
    <div className="tableScroller">
      <table>
        <caption>Risks linked to this finding</caption>
        <thead>
          <tr>
            <th scope="col">Risk</th>
            <th scope="col">Category</th>
            <th scope="col">Inherent</th>
            <th scope="col">Residual</th>
            <th scope="col">Treatment</th>
            <th scope="col">Status</th>
            <th scope="col">Action</th>
          </tr>
        </thead>
        <tbody>
          {risks.length === 0 ? (
            <tr>
              <td colSpan={7}>No enterprise risk has been linked to this finding yet.</td>
            </tr>
          ) : (
            risks.map(({ risk, treatments }) => {
              const task = tasks.find((candidate) => candidate.findingId === finding.id) ?? null;
              const linkedEvidence = task ? evidenceForTask(evidenceContexts, task.id) : [];
              const acceptance = task ? acceptanceByTask.get(task.id) ?? null : null;
              const action = task ? riskActionForTask(task, linkedEvidence, acceptance) : null;
              return (
                <tr key={risk.id}>
                  <td>
                    <strong>{risk.riskKey}</strong>
                    <small>{risk.title}</small>
                  </td>
                  <td>{risk.category}</td>
                  <td>{risk.inherentScore}</td>
                  <td>{risk.residualScore}</td>
                  <td>{treatments[0]?.strategy ?? "No plan"}</td>
                  <td>{task ? task.status.replaceAll("_", " ") : risk.status}</td>
                  <td>
                    {action && task ? (
                      <Link
                        className="reviewLink"
                        href={`/risks?findingId=${finding.id}&riskId=${risk.id}&taskId=${task.id}&mode=${action.mode}`}
                      >
                        {action.label}
                      </Link>
                    ) : (
                      <span>{selectedRisk?.risk.id === risk.id ? "Setup pending" : "Select risk"}</span>
                    )}
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

function evidenceForTask(evidenceContexts: EvidenceContext[], taskId: string): EvidenceContext[] {
  return evidenceContexts.filter((entry) =>
    entry.links.some((link) => link.targetType === "remediation_task" && link.targetId === taskId)
  );
}

function evidenceForAssessmentItem(evidenceContexts: EvidenceContext[], itemId: string): EvidenceContext[] {
  return evidenceContexts.filter((entry) =>
    entry.links.some((link) => link.targetType === "assessment_item" && link.targetId === itemId)
  );
}

/**
 * Returns true if the task has an active submission awaiting or currently under review.
 * Explicitly EXCLUDES the rejected-and-needs-resubmission state — when the last review
 * decision is "rejected" and the task is back to "in_progress", the owner must re-submit,
 * not view the review page.
 */
function taskHasSubmission(
  task: RemediationTask,
  linkedEvidence: EvidenceContext[],
  acceptance: RiskAcceptance | null,
  reviews: RemediationTaskReview[]
): boolean {
  // If the last review was a rejection the owner needs to re-submit
  if (taskIsAwaitingResubmission(task, reviews)) return false;
  return task.status === "in_progress"
    || task.status === "verified"
    || task.status === "risk_accepted"
    || linkedEvidence.length > 0
    || Boolean(acceptance)
    || reviews.length > 0;
}

/**
 * Returns true when the task was rejected by the reviewer and is now back to
 * "in_progress" so the task owner can update their answer and re-submit.
 */
function taskIsAwaitingResubmission(
  task: RemediationTask,
  reviews: RemediationTaskReview[]
): boolean {
  if (task.status !== "in_progress") return false;
  if (reviews.length === 0) return false;
  // Sort by reviewedAt descending to find the latest review
  const sorted = [...reviews].sort(
    (a, b) => new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime()
  );
  return sorted[0].decision === "rejected";
}

function riskActionForTask(
  task: RemediationTask,
  linkedEvidence: EvidenceContext[],
  acceptance: RiskAcceptance | null
): { label: string; mode: "remediate" | "review" } {
  if (task.status === "open" && linkedEvidence.length === 0 && !acceptance) {
    return { label: "Remediation", mode: "remediate" };
  }
  return { label: "View Remediation", mode: "review" };
}

function remediationScopeTags(item: AssessmentItem, question: AssessmentQuestionOption | null): string[] {
  const frameworkTags = question?.frameworkKeys.length
    ? question.frameworkKeys
    : [question?.frameworkKey ?? item.controlRef.frameworkKey ?? ""];
  const rawValues = [
    ...frameworkTags,
    question?.harmonizedControlId ?? item.controlRef.harmonizedControlId ?? "",
    question?.harmonizedControlName ?? "",
    question?.controlId ?? item.controlRef.controlId ?? "",
    question?.controlTitle ?? ""
  ];
  const values = rawValues
    .filter((value): value is string => Boolean(value))
    .map(slugTag);
  return [...new Set(values)].filter(Boolean);
}

function responseTypeLabel(value: AssessmentQuestionOption["responseType"]): string {
  return value === "multi_select" ? "Multi-select" : value[0].toUpperCase() + value.slice(1);
}

function acceptanceStatus(acceptance: RiskAcceptance): string {
  if (!acceptance.active) {
    return "expired or review-due";
  }
  return "active";
}

function dateDaysFromNow(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function dateInputValue(value: string | null | undefined): string {
  if (!value) {
    return dateDaysFromNow(0);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return dateDaysFromNow(0);
  }
  return parsed.toISOString().slice(0, 10);
}

function slugTag(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function evidenceFileName(object: EvidenceObject, version: EvidenceVersion | null): string {
  const rawObjName = (object as Record<string, unknown>).fileName ?? (object as Record<string, unknown>).name;
  if (typeof rawObjName === "string" && rawObjName.trim().length > 0) {
    return rawObjName;
  }
  if (version?.objectUri) {
    const rawUriName = version.objectUri.split("/").pop();
    if (rawUriName) {
      try {
        return decodeURIComponent(rawUriName);
      } catch {
        return rawUriName;
      }
    }
  }
  return "Evidence file";
}
