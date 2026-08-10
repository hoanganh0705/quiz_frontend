/**
 * `relationship.service.ts` — Thin SDK pass-through for the relationship
 * read endpoint.
 *
 * Source epic:   Epic 6.1 — Relationship foundations.
 * Source story:  Story 6.1.
 * Source ticket: TKT-6.1.E1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for `GET /api/v1/social/relationship/:userId`.
 * Consumed by `useRelationship` (TKT-6.1.D1). The service is the only
 * module in the social feature that talks to the SDK's relationship
 * controller directly — every downstream consumer imports through this
 * module.
 *
 * ## Pattern
 *
 * Follows the Phase 5 service-wrapper convention
 * (`instances.service.ts`, `tournaments.service.ts`,
 * `notifications.service.ts`):
 *
 *   - Pure forwarder — no side-effects, no cache mutations, no
 *     feature-flag gating. Feature flags live in the read hooks.
 *   - `ApiError` is propagated unchanged so callers can branch on
 *     `apiError.code`.
 *   - One `social:6.1` Sentry breadcrumb per call (via the helpers in
 *     `@/lib/social/social-sentry`).
 *   - If the SDK envelope is missing `data`, throw a
 *     `GLOBAL_INTERNAL_ERROR` so the caller doesn't have to handle a
 *     `T | undefined` payload.
 *   - Internal-id leakage defence: `stripRelationshipInternalIds` is
 *     always invoked before the service returns, so `followId` /
 *     `friendshipId` never reach the rest of the application (Phase 6
 *     Risks line 54).
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetRelationshipStatusResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import { stripRelationshipInternalIds } from "@/features/social/dto-adapters";
import type { RelationshipStatusDto } from "@/features/social/types";

/**
 * `GET /api/v1/social/relationship/:userId`
 *
 * Returns the relationship status between the viewer and the target
 * user. The wire shape (`SocialControllerGetRelationshipStatusResult`)
 * is the SDK's wrapped envelope:
 *
 *   { data: RelationshipStatusDto (booleans), meta: ResponseMetaDto }
 *
 * This service unwraps `data`, runs `stripRelationshipInternalIds`
 * (collapses the boolean flags into the canonical `Relationship` union
 * and discards any leaked `followId` / `friendshipId`), and returns
 * the typed `RelationshipStatusDto` projection.
 *
 * Errors are surfaced as-is — `apiError.code` carries the typed code
 * (`SOCIAL_USER_BLOCKED`, `SOCIAL_BLOCKED_USER`,
 * `GLOBAL_NOT_FOUND`, etc.) and `apiError.status` carries the HTTP
 * status. Callers should branch on `code` first and fall back to
 * `status`.
 *
 * @param userId The target user's stable identifier.
 * @returns The normalized relationship status projection.
 * @throws ApiError if the request fails or the envelope is malformed.
 */
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
