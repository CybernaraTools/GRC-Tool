import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { Request } from "express";
import { scopesForRoleKeys } from "../../identity-tenant/application/admin-role-catalog.js";
import { readRequestContext, subjectFromContext } from "../../../shared/request-context.js";
import { classificationForResourceType, evaluatePolicyDecision } from "../domain/hardening.js";
import { POLICY_METADATA_KEY, type PolicyRouteMetadata } from "./policy.decorator.js";

@Injectable()
export class PolicyGuard implements CanActivate {
  private readonly reflector = new Reflector();

  canActivate(context: ExecutionContext): boolean {
    const metadata = this.reflector.getAllAndOverride<PolicyRouteMetadata>(POLICY_METADATA_KEY, [
      context.getHandler(),
      context.getClass()
    ]);
    if (!metadata) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const requestContext = readRequestContext(request);
    const requestSubject = subjectFromContext(requestContext);
    const effectiveScopes = [...new Set([...requestSubject.scopes, ...scopesForRoleKeys(requestSubject.roles)])];
    const resourceId = metadata.resourceIdParam
      ? String(request.params[metadata.resourceIdParam] ?? "*")
      : "*";
    const decision = evaluatePolicyDecision({
      subject: { ...requestSubject, scopes: effectiveScopes },
      resource: {
        tenantId: requestContext.tenantId,
        resourceType: metadata.resourceType,
        resourceId,
        classification: classificationForResourceType(metadata.resourceType),
        state: "active"
      },
      action: metadata.action,
      traceId: requestContext.correlationId
    });

    if (decision.decision === "deny") {
      throw new ForbiddenException(decision.reason);
    }
    return true;
  }
}
