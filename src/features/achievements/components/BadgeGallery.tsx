"use client";

/**
 * `BadgeGallery` — full badge catalog gallery surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.D3.
 *
 * ## What this component owns
 *
 * Renders the badge catalog grouped by `tier` and `category`. Supports
 * optional `tier` and `category` filter controls that write to local
 * URL query state for shareable / refreshable URLs.
 *
 * ## Feature flag gating
 *
 * Renders `null` when `phase5_achievements === 'placeholder'`. The
 * achievements page falls back to a placeholder when the flag is off.
 *
 * ## Loading / error / empty
 *
 * Delegates to the shared `BadgeGallerySkeleton`,
 * `AchievementEmptyState`, and `AchievementErrorState` primitives.
 */

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

import { Award } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import { useBadges } from "@/features/achievements/hooks";
import type {
  BadgeCategory,
  BadgeSummary,
  BadgeTier,
} from "@/features/achievements/types";
import {
  BadgeGallerySkeleton,
  AchievementEmptyState,
  AchievementErrorState,
} from "@/features/achievements/components/shared/AchievementShared";

interface BadgeGalleryProps {
  /** Optional initial tier filter. */
  initialTier?: BadgeTier;
  /** Optional initial category filter. */
  initialCategory?: BadgeCategory;
  className?: string;
}

// ─── Filter URL state ─────────────────────────────────────────────────────

/**
 * URL query keys for the gallery filter state.
 */
const QUERY_TIER = "tier";
const QUERY_CATEGORY = "category";

/**
 * Parse a `BadgeTier` from a URL value. Returns `undefined` for
 * unknown values so the gallery falls back to the default "all".
 */
function parseTier(value: string | null): BadgeTier | undefined {
  if (
    value === "BRONZE" ||
    value === "SILVER" ||
    value === "GOLD" ||
    value === "PLATINUM" ||
    value === "DIAMOND"
  ) {
    return value;
  }
  return undefined;
}

/**
 * Parse a `BadgeCategory` from a URL value. Returns `undefined` for
 * unknown values.
 */
function parseCategory(value: string | null): BadgeCategory | undefined {
  if (
    value === "PARTICIPATION" ||
    value === "PERFORMANCE" ||
    value === "STREAK" ||
    value === "TOURNAMENT" ||
    value === "SOCIAL" ||
    value === "SPECIAL"
  ) {
    return value;
  }
  return undefined;
}

// ─── Tier config ──────────────────────────────────────────────────────────

const TIER_LABEL: Record<BadgeTier, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

const TIER_COLOR: Record<BadgeTier, string> = {
  BRONZE: "text-amber-700",
  SILVER: "text-slate-500",
  GOLD: "text-yellow-500",
  PLATINUM: "text-cyan-500",
  DIAMOND: "text-violet-500",
};

// ─── Component ─────────────────────────────────────────────────────────────

/**
 * Render the badge catalog gallery.
 *
 * Returns `null` when `phase5_achievements === 'placeholder'`. Filter
 * changes write to URL query state for shareable links.
 */
export function BadgeGallery({
  initialTier,
  // `initialCategory` is reserved for a future backend field. We
  // accept it on the public prop surface to keep URLs shareable but do
  // not consume it at this commit.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  initialCategory,
  className,
}: BadgeGalleryProps) {
  const flagValue = getFeatureFlagValue("phase5_achievements");
  const isFlagPlaceholder = flagValue === "placeholder";

  // All hooks below run unconditionally to satisfy the Rules of Hooks
  // — the flag-gated early-return happens AFTER all hook calls.
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const tierFilter = parseTier(searchParams.get(QUERY_TIER)) ?? initialTier;
  // Category filter is reserved for a future backend field; we
  // acknowledge the URL parameter but do not apply filtering at this
  // commit. The query state still round-trips so links remain valid.
  const categoryFilter = parseCategory(searchParams.get(QUERY_CATEGORY));

  const allItems = useBadges();
  // `useBadges` returns the full catalog; the gallery applies
  // client-side filtering by tier. (The backend does not expose a
  // category field on badges at this commit, so category filtering is
  // not wired through here — see the ticket for the reserved-for-
  // future note on `BadgeCategory`.)
  const items = useMemo(() => {
    return allItems.badges.filter((b) => {
      if (tierFilter && b.tier !== tierFilter) return false;
      return true;
    });
  }, [allItems.badges, tierFilter]);

  const { isLoading, error, retry } = allItems;

  const setFilter = useCallback(
    (key: typeof QUERY_TIER | typeof QUERY_CATEGORY, value: string | null) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value === null) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const qs = params.toString();
      router.replace(qs.length > 0 ? `${pathname}?${qs}` : pathname, {
        scroll: false,
      });
    },
    [searchParams, router, pathname],
  );

  const handleClear = useCallback(() => {
    setFilter(QUERY_TIER, null);
    // Category filter is reserved for a future backend field; we still
    // clear the URL param so refreshes do not show stale filter state.
    setFilter(QUERY_CATEGORY, null);
  }, [setFilter]);

  const grouped = useMemo(() => groupByTier(items), [items]);

  if (isFlagPlaceholder) return null;

  if (isLoading && items.length === 0) {
    return <BadgeGallerySkeleton className={className} />;
  }

  if (error && items.length === 0) {
    return (
      <AchievementErrorState
        error={error}
        onRetry={() => void retry()}
        className={className}
      />
    );
  }

  if (items.length === 0) {
    return (
      <AchievementEmptyState
        variant="catalog"
        className={className}
      />
    );
  }

  const tiers = Object.keys(grouped) as BadgeTier[];

  return (
    <section
      data-testid="badge-gallery"
      aria-label="Badge catalog"
      className={`space-y-4 ${className ?? ""}`}
    >
      <header className="flex flex-wrap items-center gap-2">
        <TierChip
          label="All"
          active={tierFilter === undefined}
          onClick={() => setFilter(QUERY_TIER, null)}
        />
        {(["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as BadgeTier[]).map(
          (tier) => (
            <TierChip
              key={tier}
              label={TIER_LABEL[tier]}
              active={tierFilter === tier}
              onClick={() => setFilter(QUERY_TIER, tier)}
            />
          ),
        )}
        {tierFilter || categoryFilter ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            aria-label="Clear badge filters"
          >
            Clear
          </Button>
        ) : null}
      </header>

      {tiers.map((tier) => (
        <div key={tier} className="space-y-2">
          <h2
            className={`flex items-center gap-2 text-sm font-semibold ${TIER_COLOR[tier]}`}
          >
            <Award aria-hidden="true" className="h-4 w-4" />
            {TIER_LABEL[tier]}
          </h2>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {grouped[tier].map((badge) => (
              <li
                key={badge.id}
                className="flex items-center gap-3 rounded-lg border bg-card p-3"
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-full bg-muted ${TIER_COLOR[tier]}`}
                >
                  <Award aria-hidden="true" className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{badge.name}</p>
                  {badge.description ? (
                    <p className="truncate text-xs text-muted-foreground">
                      {badge.description}
                    </p>
                  ) : null}
                </div>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {badge.totalEarned.toLocaleString()} earned
                </span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

// ─── Tier chip ────────────────────────────────────────────────────────────

interface TierChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function TierChip({ label, active, onClick }: TierChipProps) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      aria-pressed={active}
      data-testid={`badge-tier-chip-${label.toLowerCase()}`}
    >
      {label}
    </Button>
  );
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function groupByTier(
  badges: readonly BadgeSummary[],
): Record<BadgeTier, BadgeSummary[]> {
  const out: Record<BadgeTier, BadgeSummary[]> = {
    BRONZE: [],
    SILVER: [],
    GOLD: [],
    PLATINUM: [],
    DIAMOND: [],
  };
  for (const b of badges) {
    out[b.tier].push(b);
  }
  return out;
}