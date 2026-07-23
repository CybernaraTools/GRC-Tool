import { AssessmentWorkspacePage } from "../workspace-page";
import type { SearchParamsRecord } from "../../../src/lib/listing";

type AssessmentReviewPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default function AssessmentReviewPage({ searchParams }: AssessmentReviewPageProps) {
  return AssessmentWorkspacePage({ searchParams, mode: "review" });
}
