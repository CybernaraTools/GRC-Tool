export type QuestionSource = "canonical" | "custom";

export interface UnifiedQuestion {
  id: string;
  source: QuestionSource;
  questionVersionId: string;
  questionText: string;
  responseType: string;
  frameworkKeys: string[];
  done: boolean;
  assessmentId: string | null;
}

export interface FrameworkComplianceSummary {
  frameworkKey: string;
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  compliancePercent: number;
}

export interface DashboardSummary {
  totalQuestions: number;
  completedQuestions: number;
  remainingQuestions: number;
  overallCompletionPercent: number;
  frameworks: FrameworkComplianceSummary[];
}

/**
 * Pure aggregation over an already-assembled unified question list — no
 * DB/network access. "Completed" is derived exclusively from whether an
 * assessment exists for the question (per the spec's completion rule: no
 * manual status field, always computed from assessment existence).
 */
export function computeDashboardSummary(questions: UnifiedQuestion[]): DashboardSummary {
  const totalQuestions = questions.length;
  const completedQuestions = questions.filter((question) => question.done).length;
  const remainingQuestions = totalQuestions - completedQuestions;
  const overallCompletionPercent = totalQuestions > 0 ? round2((completedQuestions / totalQuestions) * 100) : 0;

  const byFramework = new Map<string, UnifiedQuestion[]>();
  for (const question of questions) {
    for (const frameworkKey of question.frameworkKeys) {
      const list = byFramework.get(frameworkKey) ?? [];
      list.push(question);
      byFramework.set(frameworkKey, list);
    }
  }

  const frameworks: FrameworkComplianceSummary[] = [...byFramework.entries()]
    .map(([frameworkKey, items]) => {
      const total = items.length;
      const completed = items.filter((item) => item.done).length;
      return {
        frameworkKey,
        totalQuestions: total,
        completedQuestions: completed,
        remainingQuestions: total - completed,
        compliancePercent: total > 0 ? round2((completed / total) * 100) : 0
      };
    })
    .sort((left, right) => left.frameworkKey.localeCompare(right.frameworkKey));

  return { totalQuestions, completedQuestions, remainingQuestions, overallCompletionPercent, frameworks };
}

export function complianceStatusLabel(percent: number): string {
  if (percent >= 100) return "Fully Compliant";
  if (percent >= 75) return "Good Progress";
  if (percent >= 40) return "In Progress";
  return "Needs Attention";
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
