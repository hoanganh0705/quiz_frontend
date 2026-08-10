"use client";

/**
 * `ActivityStreamItem` — Type-discriminated renderer for the
 * Story 6.4 per-user activity stream.
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.B2.
 *
 * ## What this component owns
 *
 * The single visual vocabulary for a single activity item. The
 * component:
 *
 *   - Switches on `item.payload.type` (the documented
 *     `SocialFeedItemPayload` discriminator). Each documented
 *     payload type has a typed sub-renderer.
 *   - When the discriminator is unknown (a backend-only type, a
 *     typo, or a future type this union has not yet caught up
 *     with), renders the defensive fallback with the documented
 *     `data-testid` (`activity-item-unsupported`). The fallback
 *     emits a `social:6.4` Sentry breadcrumb with reason
 *     `unknown_discriminator` so the Sentry dashboard surfaces
 *     drift in production.
 *   - **Never** crashes on an unknown discriminator.
 *
 * ## Why type-discriminated
 *
 * The activity stream is a heterogeneous list of items (badge
 * earned, quiz completed, tournament won, friend request accepted,
 * …). Each item type carries a different payload shape. The
 * discriminated union (`SocialFeedItemPayload`) is the canonical
 * wire-format; a guarded switch on `payload.type` ensures each
 * payload is rendered with its type-specific copy and links to the
 * correct detail page.
 *
 * ## Why a Client Component
 *
 * The component is marked `"use client"` because the Sentry
 * breadcrumb helper is a client primitive (it imports
 * `@sentry/nextjs`). The actual rendering is server-renderable;
 * only the breadcrumb emission is client-only.
 *
 * ## Blocked-content gating
 *
 * The component is rendered behind `BlockedContentGate` by the
 * `UserActivityStream` (TKT-6.4.F1). When the item's
 * `actorUser.userId` is in the blocked set, the gate returns
 * `null` and the `ActivityStreamItem` is never rendered. The
 * component does not need an internal block check.
 *
 * ## Naming
 *
 * The component is named `ActivityStreamItem` (rather than
 * `ActivityItem`) to avoid an export collision with the
 * `@/features/users/components/my-profile/ActivityItem` primitive
 * (an unrelated user-profile activity item). The component is
 * exclusively the social-stream primitive.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API at render time. The Sentry breadcrumb emission
 * is the only side-effect; it is a no-op when the Sentry runtime
 * is not initialised (the server-side render).
 */

import { type ReactElement } from "react";

import {
  ACTIVITY_ITEM_TYPES,
  DEFENSIVE_FALLBACK_TESTID,
  isActivityItemType,
} from "@/features/social/activity-discriminator";
import type {
  SocialActivityItemDto,
  SocialFeedItemPayload,
  SocialUserSummaryDto,
} from "@/features/social/types/relationship";
import {
  addSocialActivityBreadcrumb,
  EPIC_6_4_BREADCRUMB_CATEGORY,
  SOCIAL_EPIC_6_4_VERSION,
  SOCIAL_6_4_ROUTES,
} from "@/lib/social/social-mutuals-sentry";

interface ActivityStreamItemProps {
  /**
   * The activity item to render. The discriminator is on
   * `item.payload.type` (the documented `SocialFeedItemPayload`
   * union).
   */
  item: SocialActivityItemDto;
  /**
   * The viewer's user id. Currently unused at the primitive level
   * (the `BlockedContentGate` is the canonical owner) but accepted
   * so the eventual live surface can pass the viewer context
   * without a refactor.
   */
  viewerUserId: string;
}

// ─── Sub-renderers ────────────────────────────────────────────────────────

/**
 * Render a quiz-completed activity item.
 */
function ActivityItemQuizCompleted({
  payload,
  actor,
}: {
  payload: Extract<SocialFeedItemPayload, { type: "quiz_completed" }>;
  actor: SocialUserSummaryDto;
}): ReactElement {
  return (
    <div
      data-testid="activity-item-quiz_completed"
      data-quiz-id={payload.quizId}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span>{" "}
        completed a quiz with a score of {payload.scorePercent}%.
      </p>
    </div>
  );
}

/**
 * Render a badge-earned activity item.
 */
function ActivityItemAchievementEarned({
  payload,
  actor,
}: {
  payload: Extract<SocialFeedItemPayload, { type: "badge_earned" }>;
  actor: SocialUserSummaryDto;
}): ReactElement {
  return (
    <div
      data-testid="activity-item-badge_earned"
      data-badge-id={payload.badgeId}
      data-actor-id={actor.userId}
    >
      <p className="text-sm">
        <span className="font-medium">{actor.userName}</span>{" "}
        earned the <span className="font-medium">{payload.badgeSlug}</span> badge.
      </p>
    </div>
  );
}

// ─── Defensive fallback ───────────────────────────────────────────────────

/**
 * Render the defensive fallback for unknown discriminators.
 *
 * The fallback emits a `social:6.4` Sentry breadcrumb with reason
 * `unknown_discriminator` via the centralised
 * `addSocialActivityBreadcrumb` helper so the Sentry dashboard can
 * surface drift in production. The breadcrumb payload carries
 * the discriminator value (truncated to a safe length) and the
 * item id so the team can identify the offending backend
 * response.
 */
function ActivityItemUnsupported({
  item,
  reason,
}: {
  item: SocialActivityItemDto;
  reason: "unknown_discriminator";
}): ReactElement {
  const rawType = (item.payload?.type ?? "").toString();
  const discriminator =
    rawType.length > 0 && rawType.length <= 64 ? rawType : undefined;
  addSocialActivityBreadcrumb({
    route: SOCIAL_6_4_ROUTES.getUserActivity,
    targetUserId: item.actorUser.userId,
    surface: "user-activity",
    reason,
    ...(discriminator !== undefined ? { discriminator } : {}),
  });

  return (
    <div
      data-testid={DEFENSIVE_FALLBACK_TESTID}
      data-item-id={item.id}
      role="status"
      className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
    >
        We couldn&apos;t recognise this activity. The team has been notified.
    </div>
  );
}

// ─── Renderer ─────────────────────────────────────────────────────────────

/**
 * Render a single activity item by switching on its payload
 * discriminator.
 *
 * Each documented `ActivityItemType` has a typed sub-renderer. An
 * unknown discriminator renders the defensive fallback with the
 * documented `data-testid` and emits a `social:6.4` breadcrumb so
 * the Sentry dashboard can surface the drift.
 */
export function ActivityStreamItem({
  item,
  viewerUserId,
}: ActivityStreamItemProps): ReactElement {
  // The `viewerUserId` is accepted for parity with the future live
  // surface (the Batch F `UserActivityStream` passes the viewer
  // through). It is intentionally unused at the primitive level —
  // the `BlockedContentGate` is the canonical owner of the
  // viewer-target relationship.
  void viewerUserId;

  const payloadType = item.payload?.type;
  if (!payloadType || !isActivityItemType(payloadType)) {
    return <ActivityItemUnsupported item={item} reason="unknown_discriminator" />;
  }

  const actor = item.actorUser;

  switch (payloadType) {
    case "quiz_completed": {
      const payload = item.payload;
      return <ActivityItemQuizCompleted payload={payload} actor={actor} />;
    }
    case "badge_earned": {
      const payload = item.payload;
      return (
        <ActivityItemAchievementEarned payload={payload} actor={actor} />
      );
    }
    case "badge_revoked": {
      const payload = item.payload;
      return (
        <div
          data-testid="activity-item-badge_revoked"
          data-badge-id={payload.badgeId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            had the <span className="font-medium">{payload.badgeSlug}</span> badge revoked.
          </p>
        </div>
      );
    }
    case "rank_milestone":
    case "peak_rank_achieved": {
      const payload = item.payload;
      return (
        <div
          data-testid={`activity-item-${payloadType}`}
          data-period={payload.period}
          data-rank={payload.rank}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            reached rank #{payload.rank} ({payload.period.replace("_", " ")}).
          </p>
        </div>
      );
    }
    case "tournament_joined":
    case "tournament_won": {
      const payload = item.payload;
      const verb =
        payloadType === "tournament_joined"
          ? " joined a tournament."
          : " won a tournament.";
      return (
        <div
          data-testid={`activity-item-${payloadType}`}
          data-tournament-id={payload.tournamentId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>
            {verb}
          </p>
        </div>
      );
    }
    case "tournament_completed": {
      const payload = item.payload;
      return (
        <div
          data-testid="activity-item-tournament_completed"
          data-tournament-id={payload.tournamentId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            placed #{payload.placement} in a tournament.
          </p>
        </div>
      );
    }
    case "comment_created": {
      const payload = item.payload;
      return (
        <div
          data-testid="activity-item-comment_created"
          data-comment-id={payload.commentId}
          data-quiz-id={payload.quizId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            commented on a quiz: &ldquo;{payload.excerpt}&rdquo;
          </p>
        </div>
      );
    }
    case "quiz_milestone": {
      const payload = item.payload;
      const milestoneCopy =
        payload.milestone === "first_completion"
          ? "completed a quiz for the first time"
          : payload.milestone === "perfect_score"
            ? "achieved a perfect score"
            : "hit a quiz milestone";
      return (
        <div
          data-testid="activity-item-quiz_milestone"
          data-quiz-id={payload.quizId}
          data-milestone={payload.milestone}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            {milestoneCopy}.
          </p>
        </div>
      );
    }
    case "instance_created":
    case "instance_joined": {
      const payload = item.payload;
      const verb =
        payloadType === "instance_created"
          ? "created a multiplayer instance"
          : "joined a multiplayer instance";
      return (
        <div
          data-testid={`activity-item-${payloadType}`}
          data-instance-id={payload.instanceId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            {verb}.
          </p>
        </div>
      );
    }
    case "instance_completed": {
      const payload = item.payload;
      return (
        <div
          data-testid="activity-item-instance_completed"
          data-instance-id={payload.instanceId}
          data-actor-id={actor.userId}
        >
          <p className="text-sm">
            <span className="font-medium">{actor.userName}</span>{" "}
            completed a multiplayer instance, placed #{payload.placement}.
          </p>
        </div>
      );
    }
    default: {
      // Exhaustiveness — the `isActivityItemType` guard above
      // already narrowed the type. The explicit default branch
      // exists to satisfy the `noFallthroughCasesInSwitch` rule and
      // to make the runtime behaviour observable: an unknown item
      // type surfaces the defensive fallback.
      const _exhaustive: never = payloadType;
      void _exhaustive;
      return <ActivityItemUnsupported item={item} reason="unknown_discriminator" />;
    }
  }
}

/**
 * Read-only record exposing the documented type-list and version
 * constant. Re-exported from `@/features/social` so admin tools
 * can read `ACTIVITY_STREAM_ITEM_RENDERER_INVARIANTS.itemTypes`
 * without needing to remember the exact identifier.
 */
export const ACTIVITY_STREAM_ITEM_RENDERER_INVARIANTS = Object.freeze({
  itemTypes: ACTIVITY_ITEM_TYPES,
  defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
  epicVersion: SOCIAL_EPIC_6_4_VERSION,
  breadcrumbCategory: EPIC_6_4_BREADCRUMB_CATEGORY,
});
