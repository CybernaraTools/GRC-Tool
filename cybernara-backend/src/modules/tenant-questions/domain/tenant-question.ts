import { randomUUID } from "node:crypto";

export type TenantQuestionResponseType = "boolean" | "text" | "maturity" | "multi_select";
export type TenantQuestionStatus = "active" | "archived";

export interface TenantQuestion {
  id: string;
  tenantId: string;
  questionText: string;
  responseType: TenantQuestionResponseType;
  description: string | null;
  frameworkKeys: string[];
  status: TenantQuestionStatus;
  backingQuestionVersionId: string | null;
  createdBy: string;
  createdAt: Date;
}

export function createTenantQuestion(input: {
  tenantId: string;
  questionText: string;
  responseType: TenantQuestionResponseType;
  description?: string;
  frameworkKeys: string[];
  createdBy: string;
  now?: Date;
}): TenantQuestion {
  if (!input.questionText.trim()) {
    throw new Error("Custom question requires non-blank question text.");
  }
  if (input.frameworkKeys.length === 0) {
    throw new Error("Custom question requires at least one framework tag.");
  }
  return {
    id: randomUUID(),
    tenantId: input.tenantId,
    questionText: input.questionText.trim(),
    responseType: input.responseType,
    description: input.description?.trim() || null,
    frameworkKeys: [...new Set(input.frameworkKeys)],
    status: "active",
    backingQuestionVersionId: null,
    createdBy: input.createdBy,
    createdAt: input.now ?? new Date()
  };
}
