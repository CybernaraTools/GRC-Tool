import { redirect } from "next/navigation";
import Link from "next/link";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { UnifiedQuestion } from "../../src/lib/api/generated";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";

type QuestionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/questions"));
  }

  let questions: UnifiedQuestion[] = [];
  let apiError: string | null = null;
  try {
    questions = await createServerApiClient(session).listDashboardQuestions();
  } catch (error) {
    apiError = apiErrorMessage(error);
  }

  const search = value(resolvedSearchParams.q).toLowerCase();
  const frameworkFilter = value(resolvedSearchParams.framework).toLowerCase();
  const statusFilter = value(resolvedSearchParams.status);
  const actionError = value(resolvedSearchParams.error);

  const filtered = questions.filter((question) => {
    if (search && !question.questionText.toLowerCase().includes(search)) {
      return false;
    }
    if (frameworkFilter && !question.frameworkKeys.some((key) => key.toLowerCase().includes(frameworkFilter))) {
      return false;
    }
    if (statusFilter === "done" && !question.done) {
      return false;
    }
    if (statusFilter === "remaining" && question.done) {
      return false;
    }
    return true;
  });

  const doneCount = questions.filter((question) => question.done).length;

  return (
    <AppShell session={session} title="Questions">
      <section className="workspace" aria-labelledby="questions-heading">
        <div className="sectionHeader">
          <div>
            <p className="eyebrow">Assessment Questions</p>
            <h2 id="questions-heading">Questions</h2>
          </div>
          <span>
            {doneCount} of {questions.length} assessed
          </span>
        </div>

        <QuestionFiltersForm defaults={resolvedSearchParams} />

        {actionError ? <ErrorState title="Action failed" detail={actionError} /> : null}
        {apiError ? <ErrorState title="Questions could not be loaded" detail={apiError} /> : null}

        {!apiError && filtered.length === 0 ? (
          <EmptyState title="No questions match these filters" detail="Try widening the search or clearing filters." />
        ) : null}

        {!apiError && filtered.length > 0 ? (
          <div className="tableScroller">
            <table>
              <caption>Questions</caption>
              <thead>
                <tr>
                  <th scope="col">Question</th>
                  <th scope="col">Type</th>
                  <th scope="col">Frameworks</th>
                  <th scope="col">Status</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((question) => (
                  <tr key={`${question.source}-${question.id}`}>
                    <td>{question.questionText}</td>
                    <td>{question.responseType}</td>
                    <td>{question.frameworkKeys.join(", ") || "None"}</td>
                    <td>
                      <span className={`badge ${question.done ? "confidential" : "internal"}`}>{question.done ? "Done" : "Remaining"}</span>
                      {question.source === "custom" ? <small> (custom)</small> : null}
                    </td>
                    <td>
                      {question.done && question.assessmentId ? (
                        <Link href={`/assessments?assessmentId=${question.assessmentId}`}>View Assessment</Link>
                      ) : question.source === "canonical" ? (
                        <Link href={`/assessments?questionVersionId=${question.questionVersionId}`}>Create Assessment</Link>
                      ) : (
                        <Link href={`/assessments?customQuestionId=${question.id}`}>Create Assessment</Link>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      <CreateCustomQuestionForm />
    </AppShell>
  );
}

function QuestionFiltersForm({ defaults }: { defaults: Record<string, string | string[] | undefined> }) {
  return (
    <form className="filterForm" method="get" aria-label="Question filters">
      <label>
        Search
        <input name="q" defaultValue={value(defaults.q)} placeholder="Question text" />
      </label>
      <label>
        Framework
        <input name="framework" defaultValue={value(defaults.framework)} placeholder="SOC2" />
      </label>
      <label>
        Status
        <select name="status" defaultValue={value(defaults.status)}>
          <option value="">Any</option>
          <option value="done">Done</option>
          <option value="remaining">Remaining</option>
        </select>
      </label>
      <div className="formActions">
        <button type="submit">Apply filters</button>
        <Link href="/questions">Reset</Link>
      </div>
    </form>
  );
}

function CreateCustomQuestionForm() {
  return (
    <section className="workspace" aria-labelledby="custom-question-heading">
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">Custom Questions</p>
          <h2 id="custom-question-heading">Create a custom question</h2>
        </div>
      </div>
      <form action="/questions/actions" method="post" className="filterForm" aria-label="Create custom question">
        <input type="hidden" name="intent" value="createCustomQuestion" />
        <label>
          Question text
          <input name="questionText" required placeholder="Does the organization perform quarterly access reviews?" />
        </label>
        <label>
          Response type
          <select name="responseType" defaultValue="text">
            <option value="text">Text</option>
            <option value="boolean">Boolean</option>
            <option value="maturity">Maturity</option>
            <option value="multi_select">Multi-select</option>
          </select>
        </label>
        <label>
          Frameworks (comma-separated)
          <input name="frameworkKeys" required placeholder="SOC2, ISO27001" />
        </label>
        <label>
          Description (optional)
          <input name="description" placeholder="Additional context for this question" />
        </label>
        <div className="formActions">
          <button type="submit">Create custom question</button>
        </div>
      </form>
    </section>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
