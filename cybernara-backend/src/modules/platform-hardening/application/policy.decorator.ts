import { SetMetadata } from "@nestjs/common";

export const POLICY_METADATA_KEY = "cybernara:policy";

export interface PolicyRouteMetadata {
  resourceType: string;
  action: string;
  resourceIdParam?: string;
}

export function RequirePolicy(metadata: PolicyRouteMetadata) {
  return SetMetadata(POLICY_METADATA_KEY, metadata);
}
