import { AssessmentWorkspacePage } from "./workspace-page";
import type { SearchParamsRecord } from "../../src/lib/listing";

type AssessmentsPageProps = {
  searchParams?: Promise<SearchParamsRecord>;
};

export default function AssessmentsPage({ searchParams }: AssessmentsPageProps) {
  return AssessmentWorkspacePage({ searchParams, mode: "owner" });
}
