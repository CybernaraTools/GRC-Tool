import type { FrameworkDiff, FrameworkDiffItem, FrameworkUpdateImpact } from "../domain/diff.js";
import type { Pagination } from "../../../shared/pagination.js";

export interface FrameworkUpdateRepository {
  createDiff(input: {
    tenantId: string;
    frameworkId: string;
    fromVersionId: string;
    toVersionId: string;
    createdBy: string;
    items: Omit<FrameworkDiffItem, "id" | "version" | "diffId" | "createdBy" | "createdAt">[];
  }): Promise<FrameworkDiff>;

  findDiff(tenantId: string, diffId: string): Promise<FrameworkDiff | null>;

  listDiffs(tenantId: string, pagination: Pagination): Promise<FrameworkDiff[]>;

  listDiffItems(tenantId: string, diffId: string, pagination: Pagination): Promise<FrameworkDiffItem[]>;

  createImpacts(input: {
    tenantId: string;
    createdBy: string;
    impacts: {
      diffItemId: string;
      assessmentId: string;
      controlInstanceId?: string;
    }[];
  }): Promise<FrameworkUpdateImpact[]>;

  listImpacts(input: {
    tenantId: string;
    assessmentId?: string;
    controlInstanceId?: string;
    status?: string;
    pagination: Pagination;
  }): Promise<FrameworkUpdateImpact[]>;

  findImpact(tenantId: string, impactId: string): Promise<FrameworkUpdateImpact | null>;

  updateImpact(input: {
    tenantId: string;
    impactId: string;
    status: string;
    resolutionRationale: string;
    resolvedBy: string;
    updatedBy: string;
  }): Promise<FrameworkUpdateImpact>;

  fetchVersionControls(tenantId: string, frameworkVersionId: string): Promise<unknown[]>;

  fetchActiveControlInstances(tenantId: string, fromVersionId: string): Promise<unknown[]>;

  resolveVersionIds(tenantId: string, frameworkKey: string, fromVersionKey: string, toVersionKey: string): Promise<{ frameworkId: string; fromVersionId: string; toVersionId: string } | null>;
}

export const FRAMEWORK_UPDATE_REPOSITORY = Symbol("FRAMEWORK_UPDATE_REPOSITORY");
