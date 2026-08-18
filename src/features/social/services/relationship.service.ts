

import { ApiError, getSocial } from "@/lib/api";

import type {
SocialControllerGetRelationshipStatusResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import { stripRelationshipInternalIds } from "@/features/social/dto-adapters";
import type { RelationshipStatusDto } from "@/features/social/types";

export async function getRelationshipStatus(
userId: string,
): Promise<RelationshipStatusDto> {
addSocialServiceBreadcrumb({
route: "social.getRelationshipStatus",
targetUserId: userId,
  });
const wire: SocialControllerGetRelationshipStatusResult =
await getSocial().socialControllerGetRelationshipStatus(userId);
const envelopeData = wire?.data;
if (envelopeData === null || envelopeData === undefined) {
throw new ApiError({
status: 500,
code: "GLOBAL_INTERNAL_ERROR",
message: "Get relationship status response missing envelope",
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
return stripRelationshipInternalIds(envelopeData);
}
