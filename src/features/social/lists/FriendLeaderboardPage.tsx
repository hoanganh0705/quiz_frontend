"use client";

/**
 * `FriendLeaderboardPage` — Friend Leaderboard surface.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.G2.
 *
 * ## What this component owns
 *
 * The full read-only Friend Leaderboard surface rendered at
 * `/social/friends/leaderboard`. The page:
 *
 *   - Fetches via `useFriendLeaderboard(period)` (TKT-6.3.D3).
 *   - Renders `FriendLeaderboardSkeleton` while loading and
 *     there are no cached rows.
 *   - Renders `AnalyticsEmptyState` (kind='leaderboard') when
 *     `entries.length === 0` and there is no error. The empty
 *     state is NOT an error — having no friends on the
 *     leaderboard is a valid state.
 *   - Renders `AnalyticsErrorState` when the hook reports a
 *     non-empty `error`. NOTE: `SOCIAL_FRIEND_LIST_FORBIDDEN`
 *     is mapped to "no friends" rather than an error (the
 *     privacy boundary prevents leaking whether the list is
 *     forbidden or simply empty); the empty branch handles
 *     both.
 *   - Renders one `FriendLeaderboardRow` per entry when the
 *     list is populated.
 *   - Renders a pagination footer that calls
 *     `useFriendLeaderboard.loadMore` to advance the offset.
 *   - Renders `ConsistencyNotice` above the list when
 *     `staleness !== 'fresh'`.
 *
 * ## Privacy
 *
 * The page never persists `followId` / `friendshipId`. Each
 * navigation row targets `/users/:userId` (without internal
 * ids); the analytics payload is `{ userId, period }` only.
 *
 * ## Auth
 *
 * The route is gated by `AnalyticsRouteGate` with `requireAuth`;
 * `proxy.ts` redirects unauthenticated requests upstream.
 *
 * ## Period state
 *
 * The page reads `period` from `usePeriodFilter` (TKT-6.3.B4)
 * and passes it to the hook and the row primitive. The
 * `useSocialLifecycleReset` primitive fires `periodReset` on
 * logout while the viewer is on the leaderboard route.
 */

import { type ReactElement, useEffect, useRef } from "react";

import { useFriendLeaderboard } from "@/features/social/hooks/useFriendLeaderboard";
import { usePeriodFilter } from "@/features/social/hooks/usePeriodFilter";
import { useSocialLifecycleReset } from "@/features/social/hooks/useSocialLifecycleReset";

import { AnalyticsEmptyState } from "@/features/social/components/AnalyticsEmptyState";
import { AnalyticsErrorState } from "@/features/social/components/AnalyticsErrorState";
import { ConsistencyNotice } from "@/features/social/components/ConsistencyNotice";
import { FriendLeaderboardRow } from "@/features/social/components/FriendLeaderboardRow";
import { FriendLeaderboardSkeleton } from "@/features/social/components/FriendLeaderboardSkeleton";

import {
  addSocialLeaderboardBreadcrumb,
} from "@/lib/social/social-block-sentry";
import {
  mapAnalyticsPeriodToLeaderboardPeriod,
} from "@/features/social/types/analytics";

/**
 * Render the Friend Leaderboard page.
 */
export function FriendLeaderboardPage(): ReactElement {
  const periodFilter = usePeriodFilter();
  // Fire `periodReset` on logout so a subsequent user does not
  // inherit the prior user's period selection.
  useSocialLifecycleReset({ periodReset: periodFilter.reset });

  const { entries, isLoading, isStale, error, retry, hasMore, loadMore, staleness } =
    useFriendLeaderboard(periodFilter.period);

  // TKT-6.3.H2 — emit a single `social:6.3` breadcrumb per
  // first-page fetch transition. The leaderboard's `loadMore`
  // path does not emit a breadcrumb; the breadcrumb describes
  // the first page the user actually saw, not each subsequent
  // pagination page.
  const prevFetchRef = useRef<{
    state: "loading" | "ready" | "error";
    period: typeof periodFilter.period;
  } | null>(null);
  useEffect(() => {
    const next: "loading" | "ready" | "error" =
      error !== null && entries.length === 0
        ? "error"
        : entries.length > 0
        ? "ready"
        : "loading";
    if (
      prevFetchRef.current?.state === next &&
      prevFetchRef.current.period === periodFilter.period
    ) {
      return;
    }
    prevFetchRef.current = { state: next, period: periodFilter.period };
    addSocialLeaderboardBreadcrumb({
      offset: 0,
      limit: entries.length,
      total: entries.length,
      period: mapAnalyticsPeriodToLeaderboardPeriod(periodFilter.period),
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [entries, error, periodFilter.period]);

  // Loading branch — no cached rows.
  if (isLoading && entries.length === 0) {
    return (
      <section
        data-testid="friend-leaderboard-page-loading"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <FriendLeaderboardSkeleton />
      </section>
    );
  }

  // Error branch — no cached rows.
  // `SOCIAL_FRIEND_LIST_FORBIDDEN` is intentionally NOT routed
  // here: it is the privacy boundary's way of saying "no friends
  // on the leaderboard for this viewer", which is functionally
  // equivalent to "no friends yet". Surfacing an error state
  // would leak the privacy boundary into the DOM. Routing it
  // to the empty branch keeps the privacy implication implicit
  // in the empty copy.
  if (
    error !== null &&
    entries.length === 0 &&
    error.code !== "SOCIAL_FRIEND_LIST_FORBIDDEN"
  ) {
    return (
      <section
        data-testid="friend-leaderboard-page-error"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <AnalyticsErrorState
          error={error}
          isStale={isStale}
          onRetry={() => {
            retry();
          }}
        />
      </section>
    );
  }

  // Empty branch — no friends on the leaderboard is a valid
  // state (NOT an error). `SOCIAL_FRIEND_LIST_FORBIDDEN` from
  // the backend is also routed here so the privacy boundary is
  // not leaked into the DOM.
  if (entries.length === 0) {
    return (
      <section
        data-testid="friend-leaderboard-page-empty"
        aria-label="Friend leaderboard"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Friend leaderboard</h1>
        <AnalyticsEmptyState kind="leaderboard" />
      </section>
    );
  }

  return (
    <section
      data-testid="friend-leaderboard-page"
      data-is-stale={isStale ? "true" : "false"}
      data-period={periodFilter.period}
      aria-label="Friend leaderboard"
      className="flex flex-col gap-3 p-6"
    >
      <h1 className="text-xl font-semibold">Friend leaderboard</h1>
      {staleness !== "fresh" ? (
        <ConsistencyNotice staleness={staleness} />
      ) : null}
      <ul
        data-testid="friend-leaderboard-list"
        className="flex flex-col gap-1"
      >
        {entries.map((entry) => {
          // `useCursorPaginated` synthesises an `id` per entry
          // when pagination has run, but the canonical
          // row key is `(userId, rank)` so the list is stable
          // across re-renders that reorder entries.
          const key = `${entry.userId}-${entry.rank}`;
          return (
            <li key={key}>
              <FriendLeaderboardRow
                entry={entry}
                period={periodFilter.period}
              />
            </li>
          );
        })}
      </ul>
      {hasMore ? (
        <button
          type="button"
          onClick={() => {
            loadMore();
          }}
          data-testid="friend-leaderboard-page-load-more"
          className="self-start rounded-md border border-border bg-background px-3 py-1 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Load more
        </button>
      ) : null}
    </section>
  );
}