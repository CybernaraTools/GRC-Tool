import { redirect } from "next/navigation";
import { AssessmentWorkspacePage } from "../workspace-page";
import type { SearchParamsRecord } from "../../../src/lib/listing";
import { readSessionContext } from "../../../src/lib/session";
import { canReviewAssessment } from "../../../src/lib/authorization";

type AssessmentReviewPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default async function AssessmentReviewPage({ searchParams }: AssessmentReviewPageProps) {
  const session = await readSessionContext();
  if (session && !canReviewAssessment(session)) {
    redirect("/dashboard");
  }
  return AssessmentWorkspacePage({ searchParams, mode: "review" });
}
