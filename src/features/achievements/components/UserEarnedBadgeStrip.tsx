"use client";

/**
 * `UserEarnedBadgeStrip` — privacy-aware embed of a user's public
 * featured badges for the user-profile route shell.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.F3.
 *
 * ## What this component owns
 *
 * - Embed `useUserBadges(userId)` against the supplied public user.
 * - Render the server-prioritised `featuredBadges` strip with the
 *   total-badges / highest-rank / rare-badges counts.
 * - Render a privacy-aware empty state ("Badges hidden") when the
 *   server marks the user as private, or when the API throws
 *   `ACHIEVEMENT_FORBIDDEN`.
 * - Render nothing when `achievements_live === 'placeholder'`.
 *
 * ## Privacy gating (F3 AC #4)
 *
 * Privacy comes exclusively from the server response. The component
 * never infers privacy from URL or auth state. The embedding hook
 * (`useUserBadges`) returns `isPrivate: true` when the service
 * throws `ACHIEVEMENT_FORBIDDEN` (the documented server signal for
 * server-side privacy). The component renders the "Badges hidden"
 * copy in that case — never a placeholder badge.
 *
 * ## Auth gating
 *
 * The profile route may be visited by anyone (authenticated or not).
 * The public badge read is public; no auth-required surfaces are
 * rendered here.
 *
 * ## Feature flag
 *
 * Renders `null` when `achievements_live === 'placeholder'`.
 *
 * ## Loading / error / empty
 *
 *   - Loading (no cached `profile`): renders a compact strip
 *     skeleton so the embedding point never collapses.
 *   - Error (no cached `profile`): renders a compact error card.
 *   - Empty (`profile === null && !isPrivate && !isLoading`):
 *     renders the "No badges yet" copy.
 *   - `profile` present: renders the featured-badges strip with the
 *     summary counts (total, rare, highest rank).
 */

import { Award, EyeOff } from "lucide-react";

import { ApiError } from "@/lib/api";

import { isAchievementSurfaceEnabled } from "@/features/achievements/flags";
import { useUserBadges } from "@/features/achievements/hooks";
import type { EarnedBadge, BadgeTier } from "@/features/achievements/types";

interface UserEarnedBadgeStripProps {
  /** Public user identifier. `null` renders the placeholder. */
  userId: string | null;
  className?: string;
}

// ─── Statics ───────────────────────────────────────────────────────────────

const TIER_COLOR: Record<BadgeTier, string> = {
  BRONZE: "text-amber-700",
  SILVER: "text-slate-500",
  GOLD: "text-yellow-500",
  PLATINUM: "text-cyan-500",
  DIAMOND: "text-violet-500",
};

// ─── Empty / error / skeleton states ──────────────────────────────────────

function BadgesHidden({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-badges-hidden"
      aria-label="Badges hidden"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <EyeOff
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div>
          <p className="text-sm font-medium">Badges hidden</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            This user has chosen to keep their badge collection private.
          </p>
        </div>
      </div>
    </section>
  );
}

function BadgesNoData({ className }: { className?: string }) {
  return (
    <section
      data-testid="user-badges-no-data"
      aria-label="No badges yet"
      className={`rounded-lg border bg-card p-4 ${className ?? ""}`}
    >
      <div className="flex items-start gap-3">
        <Award
          aria-hidden="true"
          className="mt-0.5 h-5 w-5 text-muted-foreground"
        />
        <div>
          <p className="text-sm font-medium">No badges yet</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Once they earn a badge, the top featured ones will show up
            here.
          </p>
        </div>
      </div>
    </section>
  );
}

function UserEarnedBadgeStripSkeleton({ className }: { className?: string }) {
  return (
    <div
      data-testid="user-earned-badge-strip-skeleton"
      aria-busy="true"
      className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
      <div className="h-3 w-32 animate-pulse rounded bg-muted" />
      <div className="flex gap-3">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div
            key={idx}
            className="h-12 w-12 animate-pulse rounded-full bg-muted"
          />
        ))}
      </div>
    </div>
  );
}

function UserEarnedBadgeErrorState({
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
      data-testid="user-earned-badge-strip-error"
      role="alert"
      className={`rounded-lg border border-destructive/40 bg-destructive/5 p-4 ${className ?? ""}`}
    >
      <p className="text-sm font-medium text-destructive">
        Could not load badges
      </p>
      <p className="mt-0.5 text-xs text-muted-foreground">{error.message}</p>
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

// ─── Featured badge chip ──────────────────────────────────────────────────

function BadgeChip({ badge }: { badge: EarnedBadge }) {
  return (
    <li
      data-testid={`user-badge-chip-${badge.id}`}
      aria-label={badge.name}
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-muted"
    >
      <Award
        aria-hidden="true"
        className={`h-5 w-5 ${TIER_COLOR[badge.tier]}`}
      />
    </li>
  );
}

// ─── Component ────────────────────────────────────────────────────────────

/**
 * Render a public user's featured-badge strip for embedding in the
 * user-profile route shell.
 *
 * Returns `null` when:
 *
 *   - `achievements_live === 'placeholder'`.
 *   - `userId === null` (no user context supplied).
 *
 * Otherwise renders:
 *
 *   - A privacy-aware empty state when `isPrivate === true`.
 *   - A compact error card on transient fetch errors (with a manual
 *     retry action).
 *   - A "No badges yet" empty state when the user has no earned
 *     badges.
 *   - The featured-badge strip with the server-provided summary
 *     counts.
 */
export function UserEarnedBadgeStrip({
  userId,
  className,
}: UserEarnedBadgeStripProps) {
  const isLive = isAchievementSurfaceEnabled();

  const { profile, isLoading, error, retry, isPrivate } = useUserBadges(
    isLive ? userId : null,
  );

  if (!isLive) return null;
  if (userId === null) return null;

  if (isPrivate) {
    return <BadgesHidden className={className} />;
  }

  if (isLoading && !profile) {
    return <UserEarnedBadgeStripSkeleton className={className} />;
  }

  if (error && !profile) {
    return (
      <UserEarnedBadgeErrorState
        error={error as ApiError}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (!profile) {
    return <BadgesNoData className={className} />;
  }

  return (
    <section
      data-testid="user-earned-badge-strip"
      aria-label="Public featured badges"
      className={`rounded-lg border bg-card p-4 space-y-3 ${className ?? ""}`}
    >
      <header>
        <h2 className="text-sm font-semibold">Featured badges</h2>
        <p className="mt-0.5 text-xs text-muted-foreground">
          {profile.totalBadges} total &middot; {profile.rareBadges} rare
          {profile.highestRank !== null
            ? ` · Highest rank #${profile.highestRank}`
            : ""}
        </p>
      </header>

      {profile.featuredBadges.length === 0 ? (
        <p
          data-testid="user-earned-badge-strip-empty"
          className="text-xs text-muted-foreground"
        >
          No featured badges to show.
        </p>
      ) : (
        <ol
          role="list"
          aria-label="Featured badges"
          className="flex flex-wrap gap-3"
        >
          {profile.featuredBadges.map((badge) => (
            <BadgeChip key={badge.id} badge={badge} />
          ))}
        </ol>
      )}
    </section>
  );
}
