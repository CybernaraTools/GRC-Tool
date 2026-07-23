import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";
import { PlatformOnboardingService } from "./platform-onboarding.service.js";
import type { PlatformRole } from "./platform-onboarding.types.js";

export interface PlatformRequestContext {
  userId: string;
  email?: string;
  platformRole: PlatformRole;
}

@Injectable()
export class PlatformOperatorGuard implements CanActivate {
  constructor(@Inject(PlatformOnboardingService) private readonly service: PlatformOnboardingService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const platformContext = readPlatformRequestContext(request);
    const operator = await this.service.assertActiveOperator({
      supabaseUserId: platformContext.userId,
      platformRole: platformContext.platformRole
    });
    if (operator.platformRole !== "super_admin") {
      throw new ForbiddenException("Platform operator role is not allowed.");
    }
    return true;
  }
}

export function readPlatformRequestContext(request: Request): PlatformRequestContext {
  const userId = headerValue(request.headers["x-user-id"]);
  const platformRole = headerValue(request.headers["x-platform-role"]);
  const email = headerValue(request.headers["x-user-email"]);

  if (!userId || !platformRole) {
    throw new UnauthorizedException("Missing platform operator request context.");
  }
  if (platformRole !== "super_admin") {
    throw new ForbiddenException("Unsupported platform operator role.");
  }
  return { userId, email, platformRole };
}

function headerValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) {
    return value[0];
  }
  return value;
}
