
export type FrameworkChangeType = "added" | "removed" | "modified";
export type FrameworkImpactStatus = "pending" | "reassessed" | "accepted" | "ignored";

export interface FrameworkDiff {
  id: string;
  tenantId: string;
  version: number;
  frameworkId: string;
  fromVersionId: string;
  toVersionId: string;
  frameworkKey?: string;
  fromVersionKey?: string;
  toVersionKey?: string;
  createdBy: string;
  createdAt: Date;
}

export interface FrameworkDiffItem {
  id: string;
  tenantId: string;
  version: number;
  diffId: string;
  changeType: FrameworkChangeType;
  controlKey: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  createdBy: string;
  createdAt: Date;
}

export interface FrameworkUpdateImpact {
  id: string;
  tenantId: string;
  version: number;
  diffItemId: string;
  assessmentId: string;
  controlInstanceId?: string;
  status: FrameworkImpactStatus;
  resolutionRationale?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedBy: string;
  updatedAt: Date;
}
