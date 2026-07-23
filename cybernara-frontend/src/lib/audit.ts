import { z } from "zod";
import type { AuditEvent } from "./api/generated";

const auditClassifications = ["internal", "confidential", "restricted"] as const;

export const auditFilterSchema = z
  .object({
    eventType: z.string().trim().max(200).optional(),
    targetType: z.string().trim().max(200).optional(),
    targetId: z.string().trim().max(200).optional(),
    actorId: z.string().uuid().optional(),
    classification: z.enum(auditClassifications).optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    limit: z.coerce.number().int().min(1).max(500).default(50),
    offset: z.coerce.number().int().min(0).default(0)
  })
  .superRefine((value, context) => {
    if (value.from && value.to && Date.parse(value.from) > Date.parse(value.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from"],
        message: "From must be before or equal to To."
      });
    }
  });

export type AuditFilters = z.infer<typeof auditFilterSchema>;

export interface AuditEventListQuery {
  limit?: number;
  offset?: number;
  eventType?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  classification?: (typeof auditClassifications)[number];
  from?: string;
  to?: string;
}

export function parseAuditFilters(
  searchParams: Record<string, string | string[] | undefined>
): { filters: AuditFilters; errors: string[] } {
  const raw = {
    eventType: single(searchParams.eventType),
    targetType: single(searchParams.targetType),
    targetId: single(searchParams.targetId),
    actorId: single(searchParams.actorId),
    classification: single(searchParams.classification),
    from: single(searchParams.from),
    to: single(searchParams.to),
    limit: single(searchParams.limit),
    offset: single(searchParams.offset)
  };
  const cleaned = Object.fromEntries(Object.entries(raw).filter(([, value]) => value !== undefined && value !== ""));
  const parsed = auditFilterSchema.safeParse(cleaned);
  if (parsed.success) {
    return { filters: parsed.data, errors: [] };
  }
  return {
    filters: auditFilterSchema.parse({}),
    errors: parsed.error.issues.map((issue) => issue.message)
  };
}

export function auditQuery(filters: AuditFilters): AuditEventListQuery {
  return {
    limit: filters.limit,
    offset: filters.offset,
    eventType: filters.eventType,
    targetType: filters.targetType,
    targetId: filters.targetId,
    actorId: filters.actorId,
    classification: filters.classification,
    from: filters.from,
    to: filters.to
  };
}

export function formatAuditDate(value: AuditEvent["occurredAt"]): string {
  if (!value) {
    return "Not recorded";
  }
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "UTC"
  }).format(new Date(value));
}

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}
