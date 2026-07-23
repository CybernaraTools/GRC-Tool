import Link from "next/link";
import { AppShell } from "../../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../../src/components/ui-states";
import { apiErrorMessage, createServerApiClient } from "../../../src/lib/api/server";
import type {
  QuestionRepositoryControlContext,
  QuestionRepositoryConsumers,
  QuestionRepositoryEntry,
  QuestionRepositoryStatus
} from "../../../src/lib/api/generated";
import { firstValue, formatDateTime, type SearchParamsRecord } from "../../../src/lib/listing";
import { requirePlatformSession } from "../../../src/lib/protected-session";
import { QuestionRepositoryComposer } from "./question-repository-composer";

type PlatformQuestionsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

const actionPath = "/platform/questions/actions";
const pageSize = 20;

export default async function PlatformQuestionsPage({ searchParams }: PlatformQuestionsPageProps) {
  const params = searchParams ? await searchParams : {};
  const session = await requirePlatformSession("/platform/questions");
  const api = createServerApiClient(session);
  const search = textParam(params, "search");
  const status = statusParam(params, "status");
  const harmonizedControlId = textParam(params, "harmonizedControlId");
  const frameworkKey = textParam(params, "frameworkKey");
  const offset = numberParam(params, "offset");
  const selectedId = textParam(params, "questionVersionId");
  const editQuestionVersionId = textParam(params, "editQuestionVersionId");
  let questions: QuestionRepositoryEntry[] = [];
  let controls: QuestionRepositoryControlContext[] = [];
  let consumers: QuestionRepositoryConsumers | null = null;
  let versions: QuestionRepositoryEntry[] = [];
  let apiError: string | null = null;

  try {
    [questions, controls] = await Promise.all([
      api.listQuestionRepositoryEntries({
        limit: pageSize,
        offset,
        search: search || undefined,
        status: status || undefined,
        harmonizedControlId: harmonizedControlId || undefined,
        frameworkKey: frameworkKey || undefined
      }),
      api.listQuestionRepositoryControls({
        limit: 500,
        offset: 0
      })
    ]);
    const selected = questions.find((question) => question.id === selectedId);
    if (selected) {
      [consumers, versions] = await Promise.all([
        api.getQuestionRepositoryConsumers(selected.id),
        api.compareQuestionRepositoryVersions(selected.questionSetId)
      ]);
    }
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  return (
    <AppShell session={session} title="Question Repository">
      <section className="workspace" aria-labelledby="question-repository-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Platform super-admin</p>
            <h2 id="question-repository-heading">Governed question repository</h2>
          </div>
          <span>{questions.length ? `${offset + 1}-${offset + questions.length} shown` : "0 shown"}</span>
        </div>
        {apiError ? <ErrorState title="Question repository could not be loaded" detail={apiError} /> : null}
        {!apiError ? (
          <>
            <RepositoryFilters
              search={search}
              status={status}
              controls={controls}
              selectedControlId={harmonizedControlId}
              selectedFrameworkKey={frameworkKey}
            />
            <RepositoryActions controls={controls} editingQuestion={questions.find((question) => question.id === editQuestionVersionId) ?? null} />
            <QuestionTable questions={questions} params={params} offset={offset} />
            <RepositoryPagination questions={questions} params={params} offset={offset} />
          </>
        ) : null}
      </section>

      {!apiError && consumers ? <ConsumersPanel consumers={consumers} versions={versions} /> : null}
    </AppShell>
  );
}

function RepositoryFilters({
  search,
  status,
  controls,
  selectedControlId,
  selectedFrameworkKey
}: {
  search: string;
  status: QuestionRepositoryStatus | "";
  controls: QuestionRepositoryControlContext[];
  selectedControlId: string;
  selectedFrameworkKey: string;
}) {
  const frameworkKeys = Array.from(new Set(controls.flatMap((control) => control.frameworkKeys))).sort();
  return (
    <form className="filterForm" method="get" aria-label="Question repository filters">
      <label>
        Text search
        <input name="search" defaultValue={search} placeholder="Question text, control name, or source control" />
      </label>
      <label>
        Control
        <select name="harmonizedControlId" defaultValue={selectedControlId}>
          <option value="">All controls</option>
          {controls.map((control) => (
            <option key={control.harmonizedControlId} value={control.harmonizedControlId}>
              {control.harmonizedControlId} - {control.harmonizedControlName}
            </option>
          ))}
        </select>
      </label>
      <label>
        Framework
        <select name="frameworkKey" defaultValue={selectedFrameworkKey}>
          <option value="">All frameworks</option>
          {frameworkKeys.map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </label>
      <label>
        Status
        <select name="status" defaultValue={status}>
          <option value="">All statuses</option>
          {["draft", "pending_review", "approved", "rejected", "deprecated", "inactive", "retired"].map((entry) => (
            <option key={entry} value={entry}>{entry}</option>
          ))}
        </select>
      </label>
      <div className="formActions">
        <button type="submit">Apply filters</button>
        <Link href="/platform/questions">Reset</Link>
      </div>
    </form>
  );
}

function RepositoryActions({
  controls,
  editingQuestion
}: {
  controls: QuestionRepositoryControlContext[];
  editingQuestion: QuestionRepositoryEntry | null;
}) {
  return (
    <div className="workflowGrid repositoryWorkflowGrid">
      <QuestionRepositoryComposer actionPath={actionPath} controls={controls} editingQuestion={editingQuestion} />
    </div>
  );
}

function QuestionTable({ questions, params, offset }: { questions: QuestionRepositoryEntry[]; params: SearchParamsRecord; offset: number }) {
  if (questions.length === 0) {
    return <EmptyState title="No questions found" detail="Adjust the text, control, framework, or status filters." />;
  }
  return (
    <div className="tableScroller">
      <table>
        <caption>Question versions</caption>
        <thead>
          <tr>
            <th scope="col">#</th>
            <th scope="col">Question</th>
            <th scope="col">Type / origin</th>
            <th scope="col">Control and source overlap</th>
            <th scope="col">Status</th>
            <th scope="col">Evidence</th>
            <th scope="col">Version</th>
            <th scope="col">Actions</th>
          </tr>
        </thead>
        <tbody>
          {questions.map((question, index) => (
            <tr key={question.id}>
              <td><strong>{offset + index + 1}</strong></td>
              <td>
                <strong>{question.questionText}</strong>
                <small>{question.harmonizedControlName ?? question.harmonizedControlId}</small>
              </td>
              <td>
                <span className="badge internal">{question.responseType}</span>
                <small>{question.sourceAiQuestionVersionId ? "AI-generated" : question.sourceType} | {Math.round(question.confidence * 100)}% confidence</small>
              </td>
              <td>
                <strong>{question.harmonizedControlId}</strong>
                <small>{sourceControlSummary(question)}</small>
                <div className="tagList compactTagList">
                  {question.frameworkKeys.slice(0, 8).map((frameworkKey) => <span key={frameworkKey}>{frameworkKey}</span>)}
                </div>
              </td>
              <td><span className="badge internal">{question.status}</span></td>
              <td>{question.evidenceExpectationIds.join(", ") || "No expectation listed"}</td>
              <td>v{question.questionVersion}</td>
              <td>
                <div className="formActions compactActions">
                  <Link href={selectedHref(params, question)}>Inspect</Link>
                  <Link href={editHref(params, question)}>Edit</Link>
                  {question.status !== "approved" ? (
                    <form action={actionPath} method="post">
                      <input type="hidden" name="intent" value="approve" />
                      <input type="hidden" name="questionVersionId" value={question.id} />
                      <button type="submit">Approve</button>
                    </form>
                  ) : null}
                  {question.status === "approved" ? (
                    <form action={actionPath} method="post">
                      <input type="hidden" name="intent" value="updateStatus" />
                      <input type="hidden" name="questionVersionId" value={question.id} />
                      <input type="hidden" name="status" value="inactive" />
                      <button type="submit">Deactivate</button>
                    </form>
                  ) : null}
                  {question.status === "inactive" || question.status === "retired" || question.status === "deprecated" ? (
                    <form action={actionPath} method="post">
                      <input type="hidden" name="intent" value="updateStatus" />
                      <input type="hidden" name="questionVersionId" value={question.id} />
                      <input type="hidden" name="status" value="approved" />
                      <button type="submit">Restore</button>
                    </form>
                  ) : null}
                  {question.status !== "retired" ? (
                    <form action={actionPath} method="post">
                      <input type="hidden" name="intent" value="updateStatus" />
                      <input type="hidden" name="questionVersionId" value={question.id} />
                      <input type="hidden" name="status" value="retired" />
                      <button type="submit">Retire</button>
                    </form>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RepositoryPagination({ questions, params, offset }: { questions: QuestionRepositoryEntry[]; params: SearchParamsRecord; offset: number }) {
  const previousOffset = Math.max(0, offset - pageSize);
  const hasPrevious = offset > 0;
  const hasNext = questions.length === pageSize;
  return (
    <nav className="paginationBar" aria-label="Question repository pagination">
      <span>Showing up to {pageSize} questions per page</span>
      <div className="formActions compactActions">
        {hasPrevious ? <Link href={paginationHref(params, previousOffset)}>Previous</Link> : <span className="disabledLink">Previous</span>}
        {hasNext ? <Link href={paginationHref(params, offset + pageSize)}>Next</Link> : <span className="disabledLink">Next</span>}
      </div>
    </nav>
  );
}

function ConsumersPanel({
  consumers,
  versions
}: {
  consumers: QuestionRepositoryConsumers;
  versions: QuestionRepositoryEntry[];
}) {
  return (
    <section className="workspace" aria-labelledby="question-consumers-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Traceability</p>
          <h2 id="question-consumers-heading">Consumers and versions</h2>
        </div>
        <span>{consumers.assessments.length} assessments</span>
      </div>
      <div className="detailGrid">
        <article>
          <span className="label">Framework mappings</span>
          <strong>{consumers.frameworks.length}</strong>
          <small>{consumers.frameworks.slice(0, 5).map((entry) => `${entry.frameworkKey}:${entry.sourceControlId}`).join(", ") || "No framework consumers"}</small>
        </article>
        <article>
          <span className="label">Assessment consumers</span>
          <strong>{consumers.assessments.length}</strong>
          <small>{consumers.assessments[0]?.assessmentName ?? "No historical assessment references"}</small>
        </article>
        <article>
          <span className="label">Version history</span>
          <strong>{versions.length}</strong>
          <small>{versions.map((entry) => `v${entry.questionVersion} ${entry.status} ${formatDateTime(entry.updatedAt)}`).join(" | ")}</small>
        </article>
      </div>
    </section>
  );
}

function selectedHref(params: SearchParamsRecord, question: QuestionRepositoryEntry): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value && key !== "questionVersionId") {
      search.set(key, value);
    }
  }
  search.set("questionVersionId", question.id);
  return `/platform/questions?${search.toString()}`;
}

function editHref(params: SearchParamsRecord, question: QuestionRepositoryEntry): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value && key !== "editQuestionVersionId") {
      search.set(key, value);
    }
  }
  search.set("editQuestionVersionId", question.id);
  return `/platform/questions?${search.toString()}`;
}

function paginationHref(params: SearchParamsRecord, offset: number): string {
  const search = new URLSearchParams();
  for (const [key, input] of Object.entries(params)) {
    const value = firstValue(input);
    if (value && key !== "offset" && key !== "questionVersionId" && key !== "editQuestionVersionId") {
      search.set(key, value);
    }
  }
  if (offset > 0) {
    search.set("offset", String(offset));
  }
  const query = search.toString();
  return query ? `/platform/questions?${query}` : "/platform/questions";
}

function sourceControlSummary(question: QuestionRepositoryEntry): string {
  if (question.sourceControls.length === 0) {
    return "No source control overlap returned.";
  }
  return question.sourceControls
    .slice(0, 4)
    .map((control) => `${control.frameworkKey}:${control.sourceControlId}${control.subcontrolId ? ` / ${control.subcontrolId}` : ""}`)
    .join(", ");
}

function textParam(params: SearchParamsRecord, key: string): string {
  return firstValue(params[key]).trim();
}

function numberParam(params: SearchParamsRecord, key: string): number {
  const parsed = Number(textParam(params, key));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function statusParam(params: SearchParamsRecord, key: string): QuestionRepositoryStatus | "" {
  const value = textParam(params, key);
  return value === "draft" ||
    value === "pending_review" ||
    value === "approved" ||
    value === "rejected" ||
    value === "deprecated" ||
    value === "inactive" ||
    value === "retired"
    ? value
    : "";
}
