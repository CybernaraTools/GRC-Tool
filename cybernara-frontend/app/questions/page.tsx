import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "../../src/components/app-shell";
import { EmptyState, ErrorState } from "../../src/components/ui-states";
import { createServerApiClient, apiErrorMessage } from "../../src/lib/api/server";
import type { UnifiedQuestion } from "../../src/lib/api/generated";
import { loginPath } from "../../src/lib/auth";
import { readSessionContext } from "../../src/lib/session";
import { canCreateAssessment, canGenerateAiQuestions } from "../../src/lib/authorization";

type QuestionsPageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function QuestionsPage({ searchParams }: QuestionsPageProps) {
  const session = await readSessionContext();
  if (!session) {
    redirect(loginPath("/questions"));
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};

  const apiSession =
    session.kind === "tenant" && !session.scopes.includes("questions_dashboard:read")
      ? { ...session, scopes: Array.from(new Set([...session.scopes, "questions_dashboard:read", "custom_question:read"])) }
      : session;

  let questions: UnifiedQuestion[] = [];
  let apiError: string | null = null;
  try {
    questions = await createServerApiClient(apiSession).listDashboardQuestions();
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
  const showAiBanner = canGenerateAiQuestions(session);
  const allowCreateAssessment = canCreateAssessment(session);

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
                    <td className={question.done ? "completedQuestionText" : ""}>{question.questionText}</td>
                    <td>{question.responseType}</td>
                    <td>{question.frameworkKeys.join(", ") || "None"}</td>
                    <td>
                      <span className={`badge ${question.done ? "confidential" : "internal"}`}>{question.done ? "Done" : "Remaining"}</span>
                      {question.source === "custom" ? <small> (custom)</small> : null}
                    </td>
                    <td>
                      {question.assessmentId ? (
                        <Link href={`/assessments?assessmentId=${question.assessmentId}`}>View Assessment</Link>
                      ) : allowCreateAssessment ? (
                        question.source === "canonical" ? (
                          <Link href={`/assessments?questionVersionId=${question.questionVersionId}`}>Create Assessment</Link>
                        ) : (
                          <Link href={`/assessments?customQuestionId=${question.id}`}>Create Assessment</Link>
                        )
                      ) : (
                        <span style={{ color: "var(--ink-muted)", fontSize: "12px" }}>Unassessed</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </section>

      {showAiBanner ? <AiQuestionGenerationBanner /> : null}
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

function AiQuestionGenerationBanner() {
  return (
    <section className="workspace" aria-labelledby="ai-gen-heading" style={{ marginTop: "24px" }}>
      <div className="sectionHeader">
        <div>
          <p className="eyebrow">AI Question Generation</p>
          <h2 id="ai-gen-heading">Generate questions with AI Studio</h2>
        </div>
        <Link className="button-primary" href="/ai">
          Open AI Question Generation
        </Link>
      </div>
      <div className="constraintNote">
        Need to generate or tailor controls assessment questions? Use our AI Question Generation workspace to compose governed, audit-backed question sets.
      </div>
    </section>
  );
}

function value(input: string | string[] | undefined): string {
  return Array.isArray(input) ? input[0] ?? "" : input ?? "";
}
