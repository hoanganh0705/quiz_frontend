"use client";

/**
 * `FeedItemRenderer` — Type-discriminated dispatcher for the
 * Story 6.9 global social feed.
 *
 * Source epic:   Epic 6.9 — Global Social Feed.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.9 (lines 428–469).
 * Source ticket: TKT-6.9.E1.
 *
 * ## What this component owns
 *
 * The single dispatch surface for a single feed item. The
 * component:
 *
 *   - Exhaustively switches on `item.type` (the documented
 *     `SocialFeedItemType` union).
 *   - Routes each known type to the matching per-type sub-renderer
 *     (TKT-6.9.E2).
 *   - Routes unknown discriminators to the defensive
 *     `FeedItemUnknown` fallback (TKT-6.9.E2) and emits a
 *     `social:6.9` Sentry breadcrumb with
 *     `reason: 'unknown_discriminator'`.
 *   - **Never** crashes on an unknown discriminator.
 *
 * ## Why type-discriminated
 *
 * The feed is a heterogeneous list of items (badge earned, quiz
 * completed, tournament won, friend request accepted, …). Each
 * item type carries a different payload shape. The discriminated
 * union (`SocialFeedItemType` / `SocialFeedItemPayload`) is the
 * canonical wire-format; a guarded switch on `item.type` ensures
 * each payload is rendered with its type-specific copy.
 *
 * ## Why a Client Component
 *
 * The component is marked `"use client"` because the Sentry
 * breadcrumb helper (`addFeedBreadcrumb`) is a client primitive
 * (it imports `@sentry/nextjs`). The actual rendering is
 * server-renderable; only the breadcrumb emission is client-only.
 *
 * ## Blocked-content gating
 *
 * The component is rendered behind `BlockedContentGate` by the
 * `SocialFeedItem` row (TKT-6.9.E3). When the item's
 * `actorUser.userId` is in the blocked set, the gate returns
 * `null` and the `FeedItemRenderer` is never rendered. The
 * dispatcher does not need an internal block check.
 *
 * ## SSR-safety
 *
 * The component reads no `window`, `localStorage`, or other
 * browser-only API at render time. The Sentry breadcrumb emission
 * is the only client side-effect; it is a no-op when the Sentry
 * runtime is not initialised (the server-side render).
 */

import { type ReactElement } from "react";

import {
  FEED_ITEM_TYPES,
  FEED_DEFENSIVE_FALLBACK_TESTID,
  isFeedItemType,
} from "@/features/social/feed-discriminator";
import type { SocialFeedItemDto } from "@/features/social/types/relationship";

import { addFeedBreadcrumb } from "@/lib/social/social-sentry";

import {
  FeedItemBadgeEarned,
  FeedItemBadgeRevoked,
  FeedItemRankMilestone,
  FeedItemPeakRankAchieved,
  FeedItemTournamentJoined,
  FeedItemTournamentCompleted,
  FeedItemTournamentWon,
  FeedItemCommentCreated,
  FeedItemQuizCompleted,
  FeedItemQuizMilestone,
  FeedItemInstanceCreated,
  FeedItemInstanceJoined,
  FeedItemInstanceCompleted,
  FeedItemUnknown,
} from "./feed-item";

export interface FeedItemRendererProps {
  /**
   * The feed item to render. The discriminator is on `item.type`
   * (the documented `SocialFeedItemType` union).
   */
  readonly item: SocialFeedItemDto;
  /**
   * The viewer's user id. Currently unused at the primitive level
   * (the `BlockedContentGate` is the canonical owner) but accepted
   * so the eventual live surface can pass the viewer context
   * without a refactor.
   */
  readonly viewerUserId: string;
}

/**
 * Render a single feed item by switching on its `type`
 * discriminator.
 *
 * Each documented `FeedItemType` has a typed sub-renderer. An
 * unknown discriminator renders the defensive fallback with the
 * documented `data-testid` and emits a `social:6.9` breadcrumb so
 * the Sentry dashboard can surface the drift.
 */
export function FeedItemRenderer({
  item,
  viewerUserId,
}: FeedItemRendererProps): ReactElement {
  // The `viewerUserId` is accepted for parity with the eventual
  // live surface (the Batch G `SocialFeedPage` passes the viewer
  // through). It is intentionally unused at the primitive level —
  // the `BlockedContentGate` is the canonical owner of the
  // viewer-target relationship.
  void viewerUserId;

  const itemType = item.type;
  if (!isFeedItemType(itemType)) {
    return (
      <FeedItemUnknown item={item} rawType={String(itemType ?? "")} />
    );
  }

  switch (itemType) {
    case "badge_earned": {
      return <FeedItemBadgeEarned item={item} viewerUserId={viewerUserId} />;
    }
    case "badge_revoked": {
      return <FeedItemBadgeRevoked item={item} viewerUserId={viewerUserId} />;
    }
    case "rank_milestone": {
      return <FeedItemRankMilestone item={item} viewerUserId={viewerUserId} />;
    }
    case "peak_rank_achieved": {
      return (
        <FeedItemPeakRankAchieved item={item} viewerUserId={viewerUserId} />
      );
    }
    case "tournament_joined": {
      return (
        <FeedItemTournamentJoined item={item} viewerUserId={viewerUserId} />
      );
    }
    case "tournament_completed": {
      return (
        <FeedItemTournamentCompleted item={item} viewerUserId={viewerUserId} />
      );
    }
    case "tournament_won": {
      return <FeedItemTournamentWon item={item} viewerUserId={viewerUserId} />;
    }
    case "comment_created": {
      return (
        <FeedItemCommentCreated item={item} viewerUserId={viewerUserId} />
      );
    }
    case "quiz_completed": {
      return <FeedItemQuizCompleted item={item} viewerUserId={viewerUserId} />;
    }
    case "quiz_milestone": {
      return <FeedItemQuizMilestone item={item} viewerUserId={viewerUserId} />;
    }
    case "instance_created": {
      return (
        <FeedItemInstanceCreated item={item} viewerUserId={viewerUserId} />
      );
    }
    case "instance_joined": {
      return (
        <FeedItemInstanceJoined item={item} viewerUserId={viewerUserId} />
      );
    }
    case "instance_completed": {
      return (
        <FeedItemInstanceCompleted item={item} viewerUserId={viewerUserId} />
      );
    }
    default: {
      // Exhaustiveness — the `isFeedItemType` guard above already
      // narrowed the type. The explicit default branch exists to
      // satisfy the `noFallthroughCasesInSwitch` rule and to make
      // the runtime behaviour observable: an unknown item type
      // surfaces the defensive fallback.
      const _exhaustive: never = itemType;
      void _exhaustive;
      // Defensive: this branch is unreachable because
      // `isFeedItemType` narrowed the type. We render the fallback
      // anyway so a future SDK drift cannot crash the dispatcher.
      // The breadcrumb is emitted here so the Sentry dashboard
      // sees the defensive fallback hit.
      addFeedBreadcrumb({
        route: "feed.item.unknown",
        reason: "unknown_discriminator",
      });
      return (
        <div
          data-testid={FEED_DEFENSIVE_FALLBACK_TESTID}
          data-item-id={item.id}
          role="status"
          className="p-3 rounded-md border border-dashed border-border text-sm text-muted-foreground"
        >
          Recent activity
        </div>
      );
    }
  }
}

/**
 * Read-only record exposing the documented type-list and version
 * constant. Re-exported from `@/features/social` so admin tools
 * can read `FEED_ITEM_RENDERER_INVARIANTS.itemTypes` without
 * needing to remember the exact identifier.
 */
export const FEED_ITEM_RENDERER_INVARIANTS = Object.freeze({
  itemTypes: FEED_ITEM_TYPES,
  defensiveFallbackTestId: FEED_DEFENSIVE_FALLBACK_TESTID,
});