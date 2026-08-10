"use client";

/**
 * `UserRankingSummary` — privacy-aware embed of a user's public
 * ranking summary for the user-profile route shell.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F3.
 *
 * ## What this component owns
 *
 * - Embed `useUserRanking(userId)` against the supplied public user.
 * - Render the user's rank and total XP when the response is public.
 * - Render a privacy-aware empty state ("Ranking hidden") when the
 *   server has marked the user as private, or when the API throws
 *   `RANKING_FORBIDDEN`.
 * - Render nothing when `rankings_live === 'placeholder'`.
 *
 * ## Privacy gating (F3 AC #4)
 *
 * Privacy comes exclusively from the server response. The component
 * never infers privacy from URL or auth state. The embedding hook
 * (`useUserRanking`) returns `isPrivate: true` when the service
 * throws `RANKING_FORBIDDEN` (the documented server signal for
 * server-side privacy). The component renders the "Ranking hidden"
 * copy in that case — never a placeholder rank.
 *
 * ## Auth gating
 *
 * The profile route may be visited by anyone (authenticated or not).
 * The ranking read is public; no auth-required surfaces are rendered
 * here. The hook handles the read; the component just visualises
 * the result.
 *
 * ## Feature flag
 *
 * Renders `null` when `rankings_live === 'placeholder'`.
 *
 * ## Loading / error / empty
 *
 *   - Loading (no cached `ranking`): renders a compact skeleton so
 *     the embedding point never collapses.
 *   - Error (no cached `ranking`): renders a compact error card.
 *   - Empty (`ranking === null && !isPrivate && !isLoading && !error`):
 *     renders the "No ranking data" copy. This is distinct from the
 *     "Ranking hidden" privacy state — both render the same icon
 *     family but with different copy.
 *   - `ranking` present: renders the rank/XP summary.
 */

import { Lock, TrendingUp } from "lucide-react";

import { ApiError } from "@/lib/api";

import { isRankingSurfaceEnabled } from "@/features/rankings/flags";
import { useUserRanking } from "@/features/rankings/hooks";
import { ConsistencyNotice } from "@/features/rankings/components/shared/ConsistencyNotice";

interface UserRankingSummaryProps {
  /** Public user identifier. `null` renders the placeholder. */
  userId: string | null;
  /** Optional human-readable display name (e.g. the `@username`). */
  displayName?: string | null;
  className?: string;
}

/**
 * Privacy-aware empty state.
 *
 * Rendered when the user has hidden their ranking or when the
 * requester is not authorised to view it. The icon and copy are
 * non-actionable; the embed never offers a "follow" / "send
 * message" CTA here.
 */
function RankingHidden({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-ranking-hidden"
      aria-label="Ranking hidden"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <Lock
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div>
          <p className="text-sm font-medium">Ranking hidden</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This user has chosen to keep their ranking private.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Empty state for users with no ranking data (e.g. they&apos;ve never
 * attempted a quiz). Distinct from `RankingHidden`.
 */
function RankingNoData({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-ranking-no-data"
      aria-label="No ranking data"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <TrendingUp
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div>
          <p className="text-sm font-medium">No ranking data yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Once they play a quiz, their ranking will show up here.
          </p>
        </div>
      </div>
    </section>
  );
}

/**
 * Compact skeleton that mirrors the outer dimensions of the live
 * render (rank + xp + freshness row).
 */
function UserRankingSummarySkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="user-ranking-skeleton"
      aria-busy="true"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
          <div className="h-6 w-24 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-1">
          <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-6 w-28 animate-pulse rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function UserRankingErrorState({
  error,
  onRetry,
  className,
}: {
  error: ApiError;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <section
      data-testid="user-ranking-error"
      role="alert"
      className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-medium text-destructive">
        Could not load ranking
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {error.message}
      </p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-2 text-xs font-medium text-primary underline-offset-2 hover:underline"
      >
        Retry
      </button>
    </section>
  );
}

/**
 * Render a public user's ranking summary for embedding in the
 * user-profile route shell.
 *
 * Returns `null` when:
 *
 *   - `rankings_live === 'placeholder'`.
 *   - `userId === null` (no user context supplied).
 *
 * Otherwise renders:
 *
 *   - A privacy-aware empty state when `isPrivate === true`.
 *   - A compact error card on transient fetch errors (with a manual
 *     retry action).
 *   - A "No ranking data yet" empty state when the user has no rank.
 *   - The rank / XP summary (with eventual-consistency notice) when
 *     the response is available.
 */
export function UserRankingSummary({
  userId,
  // displayName is intentionally accepted on the public prop surface
  // so the parent can supply a context label without forcing the hook
  // to re-read the user store. We do not consume it at this commit
  // because the embed renders the rank values themselves, not the
  // user's name.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  displayName,
  className,
}: UserRankingSummaryProps) {
  const isLive = isRankingSurfaceEnabled();

  const {
    ranking,
    isLoading,
    isStale,
    error,
    retry,
    isPrivate,
  } = useUserRanking(isLive ? userId : null);

  if (!isLive) return null;
  if (userId === null) return null;

  if (isPrivate) {
    return <RankingHidden className={className} />;
  }

  if (isLoading && !ranking) {
    return <UserRankingSummarySkeleton className={className} />;
  }

  if (error && !ranking) {
    return (
      <UserRankingErrorState
        error={error as ApiError}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (!ranking) {
    return <RankingNoData className={className} />;
  }

  return (
    <section
      data-testid="user-ranking-summary"
      aria-label="Public ranking"
      className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
      <header className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Public ranking</h2>
        {/*
          `useUserRanking` does not expose `lastValidatedAt` (it is
          built on `useSingleWithRetry`, which does not surface the
          successful-response timestamp). The notice still renders
          the "Refreshing…" affordance while `isStale` is true; the
          timestamp is omitted.
        */}
        <ConsistencyNotice isStale={isStale} />
      </header>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Global rank
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {ranking.globalRank ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Total XP
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {ranking.totalScore.toLocaleString()}
          </p>
        </div>
      </div>
    </section>
  );
}
