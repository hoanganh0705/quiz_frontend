"use client";

/**
 * `SocialHubPage` — Social Hub landing page.
 *
 * Source epic:   Epic 6.3 — Social Counts, User Stats, My Analytics,
 *                and Friend Leaderboard.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.3 (lines 181–221).
 * Source ticket: TKT-6.3.E1.
 *
 * ## What this component owns
 *
 * The Social Hub landing page rendered at `/social`. The page:
 *
 *   - Aggregates the counts card (current viewer) with three
 *     entry tiles linking to the deep analytics surfaces:
 *     - `/social/me/analytics`         (My Analytics)
 *     - `/social/friends/leaderboard`  (Friend Leaderboard)
 *     - `/social/users/{id}/stats`     (the viewer's Stats,
 *       reusing the per-user stats surface from
 *       `UserStatsCard`, TKT-6.3.E3).
 *
 *   - Reads counts via `useSocialCounts(currentUserId)` from
 *     Epic 6.1 / TKT-6.1.D3. **No second counts hook is
 *     introduced** — the cross-batch invariant
 *     ("Counts ownership via the Epic 6.1 `useSocialCounts`
 *     hook") is enforced by importing only from that
 *     primitive.
 *
 *   - Renders a skeleton variant of the counts card while
 *     loading and code-specific `SocialListErrorState` when
 *     the counts fetch fails.
 *
 * ## Why entry tiles and not a tabbed surface
 *
 * The Hub is a navigation entry point, not a chart. Each
 * entry tile is a link to a dedicated surface; there is no
 * client-side state to manage. The Hub is a Server Component
 * candidate in principle, but it reads auth state and
 * feature flag values via client hooks, so it lives as a
 * Client Component inside the `useAuthSession`-mounted
 * tree.
 *
 * ## Why a skeleton variant of the counts card
 *
 * The skeleton variant mirrors `SocialCountsCard` with the
 * chips replaced by shimmer blocks. The Hub renders the
 * skeleton during initial load; subsequent fetch failures
 * fall back to the `SocialListErrorState` so the user is
 * never stuck on a blank page.
 */

import Link from "next/link";
import { type ReactElement, useEffect, useMemo, useRef } from "react";

import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import { useSocialCounts } from "@/features/social/hooks/useSocialCounts";
import { SocialCountsCard } from "@/features/social/components/SocialCountsCard";
import { SocialListErrorState } from "@/features/social/components/SocialListErrorState";
import {
  addSocialAnalyticsBreadcrumb,
  SOCIAL_ANALYTICS_ROUTES,
} from "@/lib/social/social-block-sentry";

interface EntryTileConfig {
  testId: string;
  href: (userId: string) => string;
  title: string;
  description: string;
}

const TILES: readonly EntryTileConfig[] = [
  {
    testId: "social-hub-entry-my-analytics",
    href: () => "/social/me/analytics",
    title: "Your analytics",
    description: "See your activity breakdowns by week, month, or all time.",
  },
  {
    testId: "social-hub-entry-leaderboard",
    href: () => "/social/friends/leaderboard",
    title: "Friend leaderboard",
    description: "See how you rank among your friends.",
  },
  {
    testId: "social-hub-entry-stats",
    href: (userId) => `/social/users/${encodeURIComponent(userId)}/stats`,
    title: "Your stats",
    description: "Public stats for your profile.",
  },
];

interface SocialHubPageProps {
  /**
   * Override for the entry-tile id. Defaults to the current
   * viewer's id from `useAuthSession`. Exposed so the
   * spec can drive the page without an authenticated
   * bootstrap.
   */
  currentUserIdOverride?: string | null;
}

/**
 * Render the Social Hub landing page.
 */
export function SocialHubPage(
  props: SocialHubPageProps = {},
): ReactElement {
  const { currentUserIdOverride = null } = props;
  const auth = useAuthSession();
  const viewerId =
    currentUserIdOverride ?? auth.currentUser?.userId ?? null;

  const key = useMemo(
    () => (viewerId === null ? null : viewerId),
    [viewerId],
  );

  const { counts, isLoading, isStale, error, retry } = useSocialCounts(key);

  // TKT-6.3.H2 — emit a single `social:6.3` breadcrumb per
  // counts fetch transition. The `useRef` remembers the last
  // reported state so we only emit on transitions, not every
  // render.
  const prevFetchStateRef = useRef<"loading" | "ready" | "error">(
    error !== null ? "error" : counts !== null ? "ready" : "loading",
  );
  useEffect(() => {
    const next: "loading" | "ready" | "error" =
      error !== null ? "error" : counts !== null ? "ready" : "loading";
    if (prevFetchStateRef.current === next) return;
    prevFetchStateRef.current = next;
    addSocialAnalyticsBreadcrumb({
      route: SOCIAL_ANALYTICS_ROUTES.getUserSocialStats,
      kind: "stats",
      status: error !== null ? error.status : 200,
      code: error !== null ? error.code : undefined,
    });
  }, [counts, error]);

  // Authentiation boundary. The route's `requireAuth` branch
  // in `AnalyticsRouteGate` should already short-circuit;
  // this is a defensive fallback.
  if (viewerId === null) {
    return (
      <section
        data-testid="social-hub-page"
        aria-label="Social Hub"
        className="flex flex-col gap-3 p-6"
      >
        <h1 className="text-xl font-semibold">Social</h1>
      </section>
    );
  }

  return (
    <section
      data-testid="social-hub-page"
      aria-label="Social Hub"
      className="flex flex-col gap-6 p-6"
    >
      <h1 className="text-xl font-semibold">Social</h1>
      <div data-testid="social-hub-counts-card-slot">
        {error !== null && counts === null ? (
          <SocialListErrorState
            error={error}
            isStale={isStale}
            onRetry={() => {
              void retry();
            }}
          />
        ) : counts === null && isLoading ? (
          <SocialHubCountsSkeleton />
        ) : (
          <SocialCountsCard targetUserId={viewerId} variant="hub" />
        )}
      </div>
      <nav
        data-testid="social-hub-entry-tiles"
        aria-label="Social surfaces"
        className="grid grid-cols-1 gap-3 sm:grid-cols-2"
      >
        {TILES.map((tile) => (
          <Link
            key={tile.testId}
            href={tile.href(viewerId)}
            data-testid={tile.testId}
            className="rounded-md border border-border bg-background p-4 hover:bg-accent"
          >
            <span className="block text-base font-medium">{tile.title}</span>
            <span className="mt-1 block text-sm text-muted-foreground">
              {tile.description}
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

/**
 * Skeleton variant of the counts card. Mirrors the chip
 * layout of `SocialCountsCard` with shimmer blocks so the
 * Hub never flashes a blank space during initial load.
 */
function SocialHubCountsSkeleton(): ReactElement {
  return (
    <div
      data-testid="social-counts-card-skeleton"
      aria-hidden="true"
      className="flex flex-col gap-1 p-4 rounded-md border border-border"
    >
      <div className="flex flex-wrap gap-2">
        <div
          data-slot="skeleton"
          className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
        <div
          data-slot="skeleton"
          className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
        <div
          data-slot="skeleton"
          className="bg-accent animate-pulse rounded-full h-6 w-24"
        />
      </div>
    </div>
  );
}