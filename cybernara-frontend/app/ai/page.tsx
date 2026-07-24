import { randomUUID } from "node:crypto";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../src/lib/api/server";
import type { AiGenerationProvenance, AiQuestionVersion } from "../../src/lib/api/generated";
import { firstValue, pageHref as listingPageHref, parsePage, type PageQuery, type SearchParamsRecord } from "../../src/lib/listing";
import { requireSession } from "../../src/lib/protected-session";
import { AiComposerTabs } from "./composer-tabs";
import { AiSubmitButton } from "./submit-button";

type AiPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const aiActionPath = "/ai/actions";

export default async function AiPage({ searchParams }: AiPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requireSession(`/ai${serializeSearchParams(params)}`);
  const api = createServerApiClient(session);
  let pendingQuestions: AiQuestionVersion[] = [];
  let approvedQuestions: AiQuestionVersion[] = [];
  let provenance: AiGenerationProvenance | null = null;
  let enabledFrameworkKeys: string[] = [];
  let apiError: string | null = null;
  const generationRunId = textParam(params, "generationRunId");
  const selectedQuestionId = textParam(params, "questionId");
  const generationFocus = textParam(params, "focus");
  const actionError = textParam(params, "error");
  const pendingPage = parsePage(params, "pending", 10);
  const approvedPage = parsePage(params, "approved", 10);

  try {
    const [pending, approved, enabledFrameworks] = await Promise.all([
      api.listPendingAiQuestions(pendingPage),
      api.listApprovedAiQuestions(approvedPage),
      api.listEnabledFrameworks()
    ]);
    pendingQuestions = pending;
    approvedQuestions = approved;
    enabledFrameworkKeys = enabledFrameworks.map((framework) => framework.frameworkKey).sort();
    if (generationRunId) {
      provenance = await api.getAiGenerationProvenance(generationRunId);
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const generatedQuestions = provenanceQuestions(provenance);
  const selectedQuestion = selectedQuestionId
    ? pendingQuestions.find((question) => question.id === selectedQuestionId) ??
      approvedQuestions.find((question) => question.id === selectedQuestionId) ??
      questionFromProvenance(provenance, selectedQuestionId)
    : generatedQuestions[0]
      ? questionFromProvenance(provenance, generatedQuestions[0].id)
      : pendingQuestions[0] ?? null;

  return (
    <AppShell session={session} title="Governed AI Review">
      <section className="workspace aiWorkbench" aria-labelledby="ai-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">AIOrchestration</p>
            <h2 id="ai-heading">Assessment question generation</h2>
          </div>
          <span>Advisory, human-gated</span>
        </div>
        {apiError ? <ErrorState title="AI workspace could not be loaded" detail={apiError} /> : null}
        {actionError ? <ErrorState title="AI action could not be completed" detail={actionError} /> : null}
        {!apiError ? (
          <>
            <AiRunOverview
              generationRunId={generationRunId}
              provenance={provenance}
              generatedQuestions={generatedQuestions}
              pendingQuestions={pendingQuestions}
              pendingHasMore={pendingQuestions.length === pendingPage.limit}
              selectedQuestion={selectedQuestion}
            />
            <AiComposerTabs actionPath={aiActionPath} frameworkKeys={enabledFrameworkKeys} />
          </>
        ) : null}
      </section>

      {!apiError ? (
        <>
          <GeneratedQuestionSet
            generationRunId={generationRunId}
            questionFocus={generationFocus}
            questions={generatedQuestions}
            selectedQuestionId={selectedQuestion?.id ?? ""}
          />
          <ProvenancePanel provenance={provenance} fallback={Boolean(textParam(params, "fallback"))} />
          <ReviewPanel
            generationRunId={generationRunId || selectedQuestion?.generationRunId || ""}
            question={selectedQuestion}
            questionFocus={generationFocus}
            reviewed={Boolean(textParam(params, "reviewed"))}
            published={Boolean(textParam(params, "published"))}
          />
          <QuestionVersionTable
            id="pending-ai-heading"
            eyebrow="Pending human review"
            heading="AI-origin question versions"
            caption="Pending AI-origin questions"
            badgeClass="confidential"
            questions={pendingQuestions}
            page={pendingPage}
            pagePrefix="pending"
            params={params}
            emptyTitle="No pending AI questions"
            emptyDetail="Generate a governed question to create an item awaiting human review."
          />
          <QuestionVersionTable
            id="approved-ai-heading"
            eyebrow="Approved question versions"
            heading="Human-approved AI questions"
            caption="Approved AI-origin questions"
            badgeClass="restricted"
            questions={approvedQuestions}
            page={approvedPage}
            pagePrefix="approved"
            params={params}
            emptyTitle="No approved AI questions"
            emptyDetail="Approve an AI-origin question to move it into the approved queue."
          />
        </>
      ) : null}
    </AppShell>
  );
}

function AiRunOverview({
  generationRunId,
  provenance,
  generatedQuestions,
  pendingQuestions,
  pendingHasMore,
  selectedQuestion
}: {
  generationRunId: string;
  provenance: AiGenerationProvenance | null;
  generatedQuestions: GeneratedQuestionSummary[];
  pendingQuestions: AiQuestionVersion[];
  pendingHasMore: boolean;
  selectedQuestion: AiQuestionVersion | null;
}) {
  const status = stringValue(provenance?.status) || (generationRunId ? "Loading" : "Ready");
  const frameworkCount = uniqueFrameworks(generatedQuestions).length;
  const pendingInRun = generatedQuestions.filter((question) => question.state === "pending_review").length;

  return (
    <div className="aiRunOverview" aria-label="AI generation status">
      <article>
        <span className="label">Current run</span>
        <strong>{generationRunId ? shortId(generationRunId) : "New"}</strong>
        <small>{status}</small>
      </article>
      <article>
        <span className="label">Generated</span>
        <strong>{generatedQuestions.length}</strong>
        <small>{generatedQuestions.length === 1 ? "question in this run" : "questions in this run"}</small>
      </article>
      <article>
        <span className="label">Awaiting review</span>
        <strong>{generationRunId ? pendingInRun : `${pendingQuestions.length}${pendingHasMore ? "+" : ""}`}</strong>
        <small>{generationRunId ? "in selected run" : "on current queue page"}</small>
      </article>
      <article>
        <span className="label">Selected item</span>
        <strong>{selectedQuestion ? responseTypeLabel(selectedQuestion.responseType) : "None"}</strong>
        <small>{frameworkCount > 0 ? `${frameworkCount} mapped frameworks` : "No run selected"}</small>
      </article>
    </div>
  );
}

function GeneratedQuestionSet({
  generationRunId,
  questionFocus,
  questions,
  selectedQuestionId
}: {
  generationRunId: string;
  questionFocus: string;
  questions: GeneratedQuestionSummary[];
  selectedQuestionId: string;
}) {
  if (!generationRunId) {
    return null;
  }

  return (
    <section className="workspace" aria-labelledby="generated-ai-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Generated result</p>
          <h2 id="generated-ai-heading">Questions for this focus</h2>
        </div>
        <span>{questions.length} generated</span>
      </div>
      {questionFocus ? (
        <div className="generatedFocus">
          <span className="label">Focus</span>
          <strong>{questionFocus}</strong>
        </div>
      ) : null}
      {questions.length === 0 ? (
        <EmptyState title="No generated questions returned" detail="Run question generation again or select a different generation from pending review." />
      ) : (
        <div className="generatedQuestionList" role="list" aria-label="Questions generated for the selected focus">
          {questions.map((question, index) => (
            <article
              key={question.id}
              className={`generatedQuestionItem${question.id === selectedQuestionId ? " selectedQuestionItem" : ""}`}
              role="listitem"
            >
              <div className="questionIndex">
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="questionMain">
                <div className="questionTitleRow">
                  <div className="questionTitleStack">
                    <div className="questionBadgeRow">
                      <span className="badge internal">{responseTypeLabel(question.responseType)}</span>
                      <span className={`badge ${question.state === "pending_review" ? "confidential" : "restricted"}`}>{stateLabel(question.state)}</span>
                    </div>
                    <h3>{question.questionText}</h3>
                  </div>
                </div>
                <div className="questionMeta">
                  <span>{Math.round(question.confidence * 100)}% confidence</span>
                  <span>{question.evidenceExpectationIds.length} evidence expectations</span>
                  <span>{question.citations.length} citations</span>
                </div>
                <div className="tagSection">
                  <span className="label">Evidence</span>
                  <TagPreview values={question.evidenceExpectationIds} emptyLabel="No evidence expectation returned" limit={3} />
                </div>
                <div className="tagSection">
                  <span className="label">Citations</span>
                  <TagPreview
                    values={uniqueStrings(question.citations.map((citation) => citation.sourceId))}
                    emptyLabel="No citations returned"
                    limit={8}
                  />
                </div>
              </div>
              <div className="questionAction">
                {question.id === selectedQuestionId ? (
                  <span className="badge restricted">Selected</span>
                ) : (
                  <Link className="reviewLink" href={questionHref(generationRunId, question.id, questionFocus)}>Review</Link>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function QuestionVersionTable({
  id,
  eyebrow,
  heading,
  caption,
  badgeClass,
  questions,
  page,
  pagePrefix,
  params,
  emptyTitle,
  emptyDetail
}: {
  id: string;
  eyebrow: string;
  heading: string;
  caption: string;
  badgeClass: "confidential" | "restricted";
  questions: AiQuestionVersion[];
  page: PageQuery;
  pagePrefix: string;
  params: SearchParamsRecord;
  emptyTitle: string;
  emptyDetail: string;
}) {
  return (
    <section className="workspace" aria-labelledby={id}>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={id}>{heading}</h2>
        </div>
        <span>{questions.length} shown</span>
      </div>
      {questions.length === 0 ? (
        <EmptyState title={emptyTitle} detail={emptyDetail} />
      ) : (
        <div className="tableScroller">
          <table>
            <caption>{caption}</caption>
            <thead>
              <tr>
                <th scope="col">Question</th>
                <th scope="col">Type</th>
                <th scope="col">State</th>
                <th scope="col">Confidence</th>
                <th scope="col">Citations</th>
                <th scope="col">Action</th>
              </tr>
            </thead>
            <tbody>
              {questions.map((question) => (
                <tr key={question.id}>
                  <td>
                    <strong>{question.questionText}</strong>
                    <small>AI-origin content</small>
                  </td>
                  <td><span className="badge internal">{question.responseType}</span></td>
                  <td><span className={`badge ${badgeClass}`}>{question.state}</span></td>
                  <td>{Math.round(question.confidence * 100)}%</td>
                  <td>
                    <TagPreview
                      values={uniqueStrings(question.citations.map((citation) => citation.sourceId))}
                      emptyLabel="No citations"
                      limit={5}
                    />
                  </td>
                  <td><Link className="reviewLink" href={reviewHref(params, question)}>Review</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <QuestionPagination params={params} page={page} pagePrefix={pagePrefix} rowCount={questions.length} />
    </section>
  );
}

function QuestionPagination({
  params,
  page,
  pagePrefix,
  rowCount
}: {
  params: SearchParamsRecord;
  page: PageQuery;
  pagePrefix: string;
  rowCount: number;
}) {
  const firstRow = rowCount > 0 ? page.offset + 1 : page.offset;
  const lastRow = page.offset + rowCount;
  const previousOffset = Math.max(0, page.offset - page.limit);
  const hasNextPage = rowCount === page.limit;

  return (
    <nav className="pagination" aria-label={`${pagePrefix} AI questions pagination`}>
      <span>{rowCount > 0 ? `Showing rows ${firstRow}-${lastRow} from offset ${page.offset}` : `No rows at offset ${page.offset}`}</span>
      <div>
        {page.offset > 0 ? <Link href={listingPageHref("/ai", params, pagePrefix, previousOffset)}>Previous</Link> : <span>Previous</span>}
        {hasNextPage ? <Link href={listingPageHref("/ai", params, pagePrefix, page.offset + page.limit)}>Next</Link> : <span>Next</span>}
      </div>
    </nav>
  );
}

function TagPreview({ values, emptyLabel, limit }: { values: string[]; emptyLabel: string; limit: number }) {
  const visible = values.slice(0, limit);
  const hiddenCount = Math.max(values.length - visible.length, 0);

  return (
    <div className="tagList">
      {visible.length > 0 ? (
        <>
          {visible.map((value) => <span key={value}>{value}</span>)}
          {hiddenCount > 0 ? <span className="moreTag">+{hiddenCount} more</span> : null}
        </>
      ) : (
        <small>{emptyLabel}</small>
      )}
    </div>
  );
}

interface ProvenanceSafetyCheck {
  checkType: string;
  policyVersion: string;
  result: string;
  score?: number | null;
  redactionSummary?: unknown;
}

interface ProvenanceCitation {
  outputPath: string;
  knowledgeChunkId: string;
  locator?: string | null;
  entailmentScore?: number | null;
}

interface ProvenanceWithLineage extends AiGenerationProvenance {
  safetyChecks?: ProvenanceSafetyCheck[];
  citations?: ProvenanceCitation[];
}

type GeneratedQuestionSummary = {
  id: string;
  questionVersion: string;
  questionText: string;
  responseType: AiQuestionVersion["responseType"];
  evidenceExpectationIds: string[];
  state: "pending_review" | "approved" | "rejected";
  confidence: number;
  citations: AiQuestionVersion["citations"];
};

function ProvenancePanel({ provenance, fallback }: { provenance: AiGenerationProvenance | null; fallback: boolean }) {
  if (!provenance) {
    return (
      <section className="workspace" aria-labelledby="provenance-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Provenance</p>
            <h2 id="provenance-heading">Generation lineage</h2>
          </div>
        </div>
        <EmptyState title="No generation selected" detail="Select or create a generation run to inspect prompt, model, retrieval, fingerprints, and citations." />
      </section>
    );
  }

  const lineage = provenance as unknown as ProvenanceWithLineage;

  return (
    <section className="workspace" aria-labelledby="provenance-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Provenance</p>
          <h2 id="provenance-heading">Generation lineage</h2>
        </div>
        <span>{stringValue(lineage.status)}</span>
      </div>
      {fallback ? <div className="constraintNote">Fallback path active: AI unavailable, using curated baseline generation.</div> : null}
      <div className="detailGrid">
        <article>
          <span className="label">Prompt version</span>
          <code>{stringValue(lineage.promptVersionId)}</code>
        </article>
        <article>
          <span className="label">Model deployment</span>
          <code>{stringValue(lineage.modelDeploymentId)}</code>
        </article>
        <article>
          <span className="label">Retrieval index</span>
          <code>{stringValue(lineage.retrievalIndexId)}</code>
        </article>
        <article>
          <span className="label">Input fingerprint</span>
          <code>{stringValue(lineage.inputFingerprint).slice(0, 32)}</code>
        </article>
        <article>
          <span className="label">Output fingerprint</span>
          <code>{stringValue(lineage.outputFingerprint).slice(0, 32)}</code>
        </article>
        <article>
          <span className="label">Questions</span>
          <strong>{provenanceQuestions(lineage).length}</strong>
        </article>
      </div>

      {/* G-06 AI Governance: Safety Checks */}
      {lineage.safetyChecks && lineage.safetyChecks.length > 0 ? (
        <div className="lineageBlock">
          <h4>Governance safety checks</h4>
          <div className="lineageRows">
            {lineage.safetyChecks.map((check: ProvenanceSafetyCheck, idx: number) => (
              <div key={idx} className="lineageRow">
                <span>{check.checkType} (policy: {check.policyVersion})</span>
                <span className={`badge ${check.result === "pass" ? "internal" : "restricted"}`}>{check.result}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* G-06 AI Governance: Source Citations */}
      {lineage.citations && lineage.citations.length > 0 ? (
        <div className="lineageBlock">
          <h4>Source citations</h4>
          <div className="lineageRows">
            {lineage.citations.map((citation: ProvenanceCitation, idx: number) => (
              <div key={idx} className="lineageCitation">
                <strong>{citation.outputPath}</strong> &rarr; Chunk <code>{citation.knowledgeChunkId.slice(0, 8)}</code>
                {citation.locator ? <small>Locator: {citation.locator}</small> : null}
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function ReviewPanel({
  generationRunId,
  question,
  questionFocus,
  reviewed,
  published
}: {
  generationRunId: string;
  question: AiQuestionVersion | null;
  questionFocus: string;
  reviewed: boolean;
  published: boolean;
}) {
  return (
    <section className="workspace" aria-labelledby="ai-review-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Human approval gate</p>
          <h2 id="ai-review-heading">Review and publish</h2>
        </div>
        <span>{question?.state ?? "No question selected"}</span>
      </div>
      {reviewed ? <div className="constraintNote">Human review recorded. Publishing is now available if the run was approved.</div> : null}
      {published ? <div className="constraintNote">Question published after human approval.</div> : null}
      {question ? (
        <>
          <div className="reviewQuestionPanel">
            <article className="reviewQuestionPrimary">
              <span className="label">AI-origin question</span>
              <h3>{question.questionText}</h3>
              <small>{question.id}</small>
            </article>
            <article>
              <span className="label">Response type</span>
              <strong>{responseTypeLabel(question.responseType)}</strong>
            </article>
            <article>
              <span className="label">Human approval</span>
              <strong>{question.approvedBy ? "Approved by human reviewer" : "Required before publish"}</strong>
            </article>
            <article>
              <span className="label">Evidence</span>
              <TagPreview values={question.evidenceExpectationIds} emptyLabel="No evidence expectation returned" limit={8} />
            </article>
            <article className="reviewQuestionPrimary">
              <span className="label">Citations</span>
              <TagPreview values={uniqueStrings(question.citations.map((citation) => citation.sourceId))} emptyLabel="No citations returned" limit={20} />
            </article>
          </div>
          <div className="workflowGrid">
            <form className="miniForm" action={aiActionPath} method="post" aria-label="Approve AI generation">
              <input type="hidden" name="intent" value="review" />
              <input type="hidden" name="decision" value="approved" />
              <input type="hidden" name="generationRunId" value={generationRunId} />
              <input type="hidden" name="questionId" value={question.id} />
              <input type="hidden" name="questionFocus" value={questionFocus} />
              <HiddenIdempotency />
              <label>
                Human rationale
                <textarea name="rationale" defaultValue="Human reviewer approved cited, scoped output." />
              </label>
              <AiSubmitButton icon="verified" pendingLabel="Recording approval">
                Approve as human reviewer
              </AiSubmitButton>
            </form>
            <form className="miniForm" action={aiActionPath} method="post" aria-label="Publish approved AI question set">
              <input type="hidden" name="intent" value="publishRun" />
              <input type="hidden" name="generationRunId" value={generationRunId} />
              <input type="hidden" name="questionId" value={question.id} />
              <input type="hidden" name="questionFocus" value={questionFocus} />
              <HiddenIdempotency />
              <p>Publishing is intentionally separate from review and writes every approved question in this run to the assessment catalog.</p>
              <AiSubmitButton icon="publish" pendingLabel="Publishing question" disabled={question.state !== "approved"}>
                Publish approved question set
              </AiSubmitButton>
            </form>
          </div>
        </>
      ) : (
        <EmptyState title="No AI-origin question selected" detail="Generate or select a pending question before review." />
      )}
    </section>
  );
}

function HiddenIdempotency() {
  return <input type="hidden" name="idempotencyKey" value={randomUUID()} />;
}

function questionFromProvenance(provenance: AiGenerationProvenance | null, questionId: string): AiQuestionVersion | null {
  const entry = provenanceQuestions(provenance).find((candidate) => candidate.id === questionId);
  if (!entry) {
    return null;
  }
  return {
    id: entry.id,
    generationRunId: stringValue(provenance?.generationRunId),
    generationStatus: statusValue(provenance?.status),
    version: entry.questionVersion,
    questionText: entry.questionText,
    responseType: entry.responseType,
    evidenceExpectationIds: entry.evidenceExpectationIds,
    citations: entry.citations,
    confidence: entry.confidence,
    state: entry.state
  };
}

function provenanceQuestions(provenance: AiGenerationProvenance | null): GeneratedQuestionSummary[] {
  const questions = provenance?.questions;
  if (!Array.isArray(questions)) {
    return [];
  }
  return questions
    .filter((question): question is Record<string, unknown> => typeof question === "object" && question !== null)
    .map((question) => ({
      id: stringValue(question.id),
      questionVersion: stringValue(question.questionVersion),
      questionText: stringValue(question.questionText) || "AI-origin assessment question",
      responseType: responseTypeValue(question.responseType),
      evidenceExpectationIds: stringArrayValue(question.evidenceExpectationIds),
      state: reviewState(question.state),
      confidence: typeof question.confidence === "number" ? question.confidence : 0,
      citations: Array.isArray(question.citations) ? (question.citations as AiQuestionVersion["citations"]) : []
    }))
    .filter((question) => question.id);
}

function questionHref(generationRunId: string, questionId: string, questionFocus: string): string {
  const params = new URLSearchParams({ generationRunId, questionId });
  if (questionFocus) {
    params.set("focus", questionFocus);
  }
  return `/ai?${params.toString()}`;
}

function reviewHref(params: SearchParamsRecord, question: AiQuestionVersion): string {
  const search = searchParamsFromRecord(params);
  search.set("generationRunId", question.generationRunId ?? "");
  search.set("questionId", question.id);
  search.delete("reviewed");
  search.delete("published");
  search.delete("error");
  return `/ai?${search.toString()}`;
}

function responseTypeLabel(value: AiQuestionVersion["responseType"]): string {
  const labels: Record<AiQuestionVersion["responseType"], string> = {
    boolean: "Boolean",
    text: "Text",
    maturity: "Maturity",
    multi_select: "Multi-select"
  };
  return labels[value];
}

function stateLabel(value: GeneratedQuestionSummary["state"]): string {
  return value === "pending_review" ? "Pending review" : value === "approved" ? "Approved" : "Rejected";
}

function uniqueFrameworks(questions: GeneratedQuestionSummary[]): string[] {
  const frameworks = questions.flatMap((question) =>
    question.citations
      .map((citation) => citation.sourceId)
      .filter((sourceId) => sourceId.includes(":"))
      .map((sourceId) => sourceId.split(":")[0])
  );
  return [...new Set(frameworks)].sort();
}

function uniqueStrings(values: string[]): string[] {
  return [...new Set(values)];
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string" && entry.length > 0) : [];
}

function responseTypeValue(value: unknown): AiQuestionVersion["responseType"] {
  return value === "boolean" || value === "maturity" || value === "multi_select" ? value : "text";
}

function statusValue(value: unknown): AiQuestionVersion["generationStatus"] {
  return value === "fallback_used" || value === "approved" || value === "rejected" ? value : "awaiting_review";
}

function reviewState(value: unknown): "pending_review" | "approved" | "rejected" {
  return value === "approved" || value === "rejected" ? value : "pending_review";
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function textParam(params: SearchParamsRecord, key: string): string {
  return firstValue(params[key]).trim();
}

function serializeSearchParams(params: SearchParamsRecord): string {
  const search = searchParamsFromRecord(params);
  const query = search.toString();
  return query ? `?${query}` : "";
}

function searchParamsFromRecord(params: SearchParamsRecord): URLSearchParams {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value) {
      search.set(key, value);
    }
  }
  return search;
}
