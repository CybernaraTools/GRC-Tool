import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import type { Classification, PolicySubject } from "../modules/platform-hardening/domain/hardening.js";

export interface RequestContext {
  tenantId: string;
  userId: string;
  roles: string[];
  scopes: string[];
  clearance: Classification;
  correlationId: string;
}

const classifications = new Set<Classification>(["public", "internal", "confidential", "restricted"]);

export function readRequestContext(request: Request): RequestContext {
  const tenantId = headerValue(request, "x-tenant-id");
  const userId = headerValue(request, "x-user-id");
  if (!tenantId || !userId) {
    throw new UnauthorizedException("x-tenant-id and x-user-id headers are required.");
  }

  const clearance = parseClassification(headerValue(request, "x-user-clearance") ?? "public");
  return {
    tenantId,
    userId,
    roles: splitHeader(headerValue(request, "x-user-roles")),
    scopes: splitHeader(headerValue(request, "x-user-scopes")),
    clearance,
    correlationId: headerValue(request, "x-correlation-id") ?? headerValue(request, "x-request-id") ?? "missing-correlation-id"
  };
}

export function subjectFromContext(context: RequestContext): PolicySubject {
  return {
    tenantId: context.tenantId,
    userId: context.userId,
    roles: context.roles,
    scopes: context.scopes,
    clearance: context.clearance
  };
}

function headerValue(request: Request, name: string): string | undefined {
  const value = request.headers[name];
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}

function splitHeader(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];
}

function parseClassification(value: string): Classification {
  if (classifications.has(value as Classification)) {
    return value as Classification;
  }
  throw new UnauthorizedException("x-user-clearance must be a valid Cybernara classification.");
}
