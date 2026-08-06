"use client";

/**
 * `UserActivityStream` — Page component for the per-user activity
 * stream surface (Story 6.4).
 *
 * Source epic:   Epic 6.4 — Mutual Friends, Mutual Followers, and
 *                User Activity Stream.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.4 (lines 222–259).
 * Source ticket: TKT-6.4.F1.
 *
 * ## What this component owns
 *
 * The full activity stream surface for the route
 * `/social/users/:id/activity`. The page composes:
 *
 *   - `useUserActivity(targetUserId)` (TKT-6.4.D2) for the data.
 *   - `ActivityStreamItem` (TKT-6.4.B2) for type-discriminated
 *     rendering.
 *   - `ActivitySkeleton` (TKT-6.4.B3) for the loading skeleton.
 *   - `ActivityRateLimitNotice` (TKT-6.4.B3) for the rate-limit branch
 *     (the dedicated surface — `ActivityErrorState` deliberately
 *     does NOT render the rate-limit copy).
 *   - `ActivityEmptyState` (TKT-6.4.B4) for the empty branch.
 *   - `ActivityErrorState` (TKT-6.4.B4) for the error branch.
 *   - `PrivacyRestrictedNotice` (Epic 6.2 / TKT-6.2.F1) for the
 *     privacy branch.
 *   - `ConsistencyNotice` (Epic 6.3 / TKT-6.3.C1) for the eventual-
 *     consistency signal.
 *   - `BlockedContentGate` (Epic 6.1) wrapping the activity list so
 *     cached items from a blocked user disappear after revalidation.
 *
 * The rendered flow:
 *
 * ```
 *   visibility !== 'visible'           → PrivacyRestrictedNotice
 *   rateLimitedUntil !== null          → ActivityRateLimitNotice (no items)
 *   isLoading && items.length === 0    → ActivitySkeleton
 *   items.length === 0 && !error       → ActivityEmptyState
 *   error !== null && items.length===0 → ActivityErrorState
 *   items.length > 0                   → ConsistencyNotice + list of ActivityStreamItem + load-more
 * ```
 *
 * ## Rate-limit precedence
 *
 * The rate-limit branch renders BEFORE the loading / empty / error
 * branches. When the activity stream is rate-limited, the page does
 * not render the cached items — the rate-limit notice is the
 * single source of truth (the user has a "try again in N seconds"
 * CTA, not stale cached data).
 *
 * ## Activity rate-limit countdown
 *
 * `cooldownSeconds = Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000))`.
 * `ActivityRateLimitNotice` decrements the displayed countdown every
 * second and calls `onCooldownComplete` when the countdown reaches
 * zero. The page passes an SWR `retry()` callback so the rate-limit
 * window is followed by an automatic revalidation.
 *
 * ## Privacy
 *
 * Non-visible viewers receive `PrivacyRestrictedNotice` (no items
 * leak). Items rendered inside the `BlockedContentGate` are
 * server-filtered (revalidated by `useRelationship` after a privacy
 * flip).
 *
 * ## No optimistic updates
 *
 * The page reads SWR via the hook. There are no local state cells
 * for "currently displayed items" — a revalidation replaces the
 * list in the same render.
 */

import {
  useCallback,
  useEffect,
  useState,
  type ReactElement,
} from "react";

import { ApiError } from "@/lib/api";

import { useUserActivity } from "@/features/social/hooks/useUserActivity";
import { isActivityRateLimitCode } from "@/features/social/activity-discriminator";

import { ActivityEmptyState } from "@/features/social/components/ActivityEmptyState";
import { ActivityErrorState } from "@/features/social/components/ActivityErrorState";
import { ActivityRateLimitNotice } from "@/features/social/components/ActivityRateLimitNotice";
import { ActivitySkeleton } from "@/features/social/components/ActivitySkeleton";
import { ActivityStreamItem } from "@/features/social/components/ActivityStreamItem";
import { BlockedContentGate } from "@/features/social/components/BlockedContentGate";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import {
  PrivacyRestrictedNotice,
  type PrivacyRestrictedNoticeVariant,
} from "@/features/social/components/PrivacyRestrictedNotice";

import type { SocialActivityItemDto } from "@/features/social/types";

// ─── Public surface ──────────────────────────────────────────────────────

interface UserActivityStreamProps {
  /** The target user id whose activity is being listed. */
  targetUserId: string;
  /**
   * The viewer user id. Passed through to `ActivityStreamItem`
   * (parity with the future live surface). When `null`, the page
   * treats the viewer as anonymous.
   */
  viewerUserId?: string | null;
}

function toPrivacyVariant(
  visibility: string,
): PrivacyRestrictedNoticeVariant {
  if (visibility === "private") return "friends_only";
  return "not_available";
}

// ─── Component ───────────────────────────────────────────────────────────

/**
 * Render the full activity stream page.
 */
export function UserActivityStream({
  targetUserId,
  viewerUserId,
}: UserActivityStreamProps): ReactElement {
  const {
    items,
    total,
    visibility,
    isLoading,
    error,
    hasMore,
    loadMore,
    retry,
    rateLimitedUntil,
    staleness,
  } = useUserActivity(targetUserId);

  const safeViewerId = viewerUserId ?? "anonymous-viewer";

  // The rate-limit branch takes precedence over the loading / empty /
  // error branches — a rate-limited viewer does NOT see cached items
  // (the rate-limit notice is the single source of truth).
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(() =>
    rateLimitedUntil !== null
      ? Math.max(0, Math.ceil((rateLimitedUntil - Date.now()) / 1000))
      : 0,
  );

  // Recompute the cooldown each second so the countdown on the
  // notice stays in sync with the next render. The `useEffect`
  // captures `Date.now()` once per second so the render path
  // stays pure. The synchronous `setCooldownSeconds(0)` reset
  // when the rate-limit lifts mirrors the documented pattern in
  // `useUserActivity` (TKT-6.4.D2): an effect-bound reset is
  // the canonical way to keep the render path pure.
  useEffect(() => {
    if (rateLimitedUntil === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCooldownSeconds(0);
      return undefined;
    }
    const tick = (): void => {
      const remaining = Math.max(
        0,
        Math.ceil((rateLimitedUntil - Date.now()) / 1000),
      );
      setCooldownSeconds(remaining);
    };
    tick();
    const id = setInterval(tick, 1_000);
    return () => clearInterval(id);
  }, [rateLimitedUntil]);

  // When the cooldown completes, refresh SWR so the cached items
  // (or the privacy notice) reflect the post-limit state.
  const handleCooldownComplete = useCallback((): void => {
    void retry();
  }, [retry]);

  if (visibility !== "visible") {
    return (
      <PrivacyRestrictedNotice
        variant={toPrivacyVariant(visibility)}
        resourceKind="followers"
      />
    );
  }

  // Rate-limit branch — render the dedicated notice; no items.
  if (rateLimitedUntil !== null) {
    return (
      <ActivityRateLimitNotice
        cooldownSeconds={cooldownSeconds}
        onCooldownComplete={handleCooldownComplete}
      />
    );
  }

  if (isLoading && items.length === 0) {
    return <ActivitySkeleton />;
  }

  // Privacy branches that look like errors (block / blocked-by)
  // surface as `ActivityEmptyState` (the documented privacy notice
  // for the activity surface). The dedicated `ActivityErrorState` is
  // reserved for transport / 5xx / unexpected-shape errors.
  if (
    items.length === 0 &&
    error !== null &&
    (error.code === "SOCIAL_USER_BLOCKED" ||
      error.code === "SOCIAL_BLOCKED_USER")
  ) {
    return <ActivityEmptyState isBlocked />;
  }

  if (error !== null && items.length === 0 && !isActivityRateLimitCode(error.code)) {
    return (
      <ActivityErrorState
        error={error}
        onRetry={() => {
          void retry();
        }}
      />
    );
  }

  if (items.length === 0) {
    return <ActivityEmptyState />;
  }

  return (
    <BlockedContentGate targetUserId={targetUserId}>
      <section
        aria-label="User activity"
        data-testid="user-activity-stream"
        data-target-user-id={targetUserId}
        data-total={total}
        className="flex flex-col gap-2"
      >
        <h1 className="text-lg font-semibold">Activity</h1>
        {staleness !== "fresh" && <ConsistencyNotice staleness={staleness} />}
        <ul className="flex flex-col gap-2">
          {items.map((item: SocialActivityItemDto) => (
            <li
              key={item.id}
              data-testid="user-activity-stream-row"
              data-item-id={item.id}
            >
              <ActivityStreamItem
                item={item}
                viewerUserId={safeViewerId}
              />
            </li>
          ))}
        </ul>
        {hasMore && (
          <button
            type="button"
            onClick={() => loadMore()}
            data-testid="user-activity-stream-load-more"
            className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Load more
          </button>
        )}
      </section>
    </BlockedContentGate>
  );
}

/**
 * Re-export the `ApiError` type for downstream consumers that want
 * to type-narrow the rate-limit branch in their own composition.
 * The type is not exposed via the page's props but is referenced
 * internally for the error-discriminator branch.
 */
export type { ApiError };
