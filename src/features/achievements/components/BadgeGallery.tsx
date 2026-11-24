"use client";

import { useCallback, useMemo, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { Users } from "lucide-react";

import { Button } from "@/components/ui/Button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { BadgeDetail } from "@/features/achievements/components/BadgeDetail";
import {
  BadgeGallerySkeleton,
  AchievementEmptyState,
  AchievementErrorState,
  TIER_CONFIG,
  getBadgeIconComponent,
} from "@/features/achievements/components/shared/AchievementShared";
import { useBadges } from "@/features/achievements/hooks";
import type {
  BadgeCategory,
  BadgeSummary,
  BadgeTier,
} from "@/features/achievements/types";

interface BadgeGalleryProps {
  initialTier?: BadgeTier;
  initialCategory?: BadgeCategory;
  className?: string;
}

const QUERY_TIER = "tier";
const QUERY_CATEGORY = "category";

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

const TIER_LABEL: Record<BadgeTier, string> = {
  BRONZE: "Bronze",
  SILVER: "Silver",
  GOLD: "Gold",
  PLATINUM: "Platinum",
  DIAMOND: "Diamond",
};

export function BadgeGallery({
  initialTier,
  initialCategory,
  className,
}: BadgeGalleryProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [inspectBadgeCode, setInspectBadgeCode] = useState<string | null>(null);

  const tierFilter = parseTier(searchParams?.get(QUERY_TIER) ?? null) ?? initialTier;
  const categoryFilter =
    parseCategory(searchParams?.get(QUERY_CATEGORY) ?? null) ?? initialCategory;

  const allItems = useBadges();

  const items = useMemo(() => {
    return allItems.badges.filter((b) => {
      if (tierFilter && b.tier !== tierFilter) return false;
      return true;
    });
  }, [allItems.badges, tierFilter]);

  const { isLoading, error, retry } = allItems;

  const setFilter = useCallback(
    (key: typeof QUERY_TIER | typeof QUERY_CATEGORY, value: string | null) => {
      const params = new URLSearchParams(
        searchParams ? Array.from(searchParams.entries()) : [],
      );
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


  const grouped = useMemo(() => groupByTier(items), [items]);

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

  const hasActiveFilters = Boolean(tierFilter || categoryFilter);

  if (items.length === 0 && !hasActiveFilters) {
    return <AchievementEmptyState variant="catalog" className={className} />;
  }

  const tiers = Object.keys(grouped) as BadgeTier[];
  const nonEmptyTiers = tiers.filter((tier) => grouped[tier].length > 0);

  return (
    <section
      data-testid="badge-gallery"
      aria-label="Badge catalog"
      className={`space-y-6 ${className ?? ""}`}
    >
      <div
        role="group"
        aria-label="Filter badges by tier"
        className="inline-flex flex-wrap items-center gap-1 rounded-xl bg-muted/60 p-1 border border-border/40 backdrop-blur-xs"
      >
        <TierChip
          label="All"
          active={tierFilter === undefined}
          onClick={() => setFilter(QUERY_TIER, null)}
        />
        {(
          ["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND"] as BadgeTier[]
        ).map((tier) => (
          <TierChip
            key={tier}
            label={TIER_LABEL[tier]}
            active={tierFilter === tier}
            tier={tier}
            onClick={() => setFilter(QUERY_TIER, tier)}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border/80 bg-card/40 py-12 px-4 text-center backdrop-blur-xs">
          <p className="text-sm font-medium text-muted-foreground">
            No badges found for the selected filter.
          </p>
        </div>
      ) : (
        nonEmptyTiers.map((tier) => {
          const tierCfg = TIER_CONFIG[tier] ?? TIER_CONFIG.BRONZE;
          const TierIcon = tierCfg.icon;
          const tierBadges = grouped[tier];
          return (
            <div key={tier} className="space-y-3">
              <h2
                className={`flex items-center gap-2 text-sm font-bold uppercase tracking-wider ${tierCfg.textColor}`}
              >
                <TierIcon aria-hidden="true" className="h-4 w-4" />
                {TIER_LABEL[tier]}
              </h2>

              <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {tierBadges.map((badge) => {
                  const BadgeIcon = getBadgeIconComponent(
                    badge.name,
                    badge.description,
                    badge.code,
                  );
                  return (
                    <li
                      key={badge.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`View details for ${badge.name}`}
                      aria-haspopup="dialog"
                      onClick={() => setInspectBadgeCode(badge.code || badge.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setInspectBadgeCode(badge.code || badge.id);
                        }
                      }}
                      className={`group relative flex items-center gap-3.5 rounded-xl border bg-card/80 p-3.5 backdrop-blur-xs transition-all duration-200 cursor-pointer hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${tierCfg.cardBorder} ${tierCfg.cardHoverGlow}`}
                    >
                      <div
                        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-transform duration-200 group-hover:scale-105 ${tierCfg.iconBg}`}
                      >
                        <BadgeIcon aria-hidden="true" className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                          {badge.name}
                        </p>
                        {badge.description ? (
                          <p className="truncate text-xs text-muted-foreground mt-0.5">
                            {badge.description}
                          </p>
                        ) : null}
                      </div>
                      <div className="shrink-0 flex items-center gap-1 font-mono text-xs tabular-nums text-muted-foreground">
                        <Users className="h-3 w-3 opacity-60" aria-hidden="true" />
                        <span>{badge.totalEarned.toLocaleString()} earned</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })
      )}

      <Dialog
        open={Boolean(inspectBadgeCode)}
        onOpenChange={(open) => !open && setInspectBadgeCode(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="sr-only">Badge Details</DialogTitle>
            <DialogDescription className="sr-only">
              Detailed badge criteria, description, and earn statistics.
            </DialogDescription>
          </DialogHeader>
          {inspectBadgeCode ? <BadgeDetail code={inspectBadgeCode} /> : null}
        </DialogContent>
      </Dialog>
    </section>
  );
}

interface TierChipProps {
  label: string;
  active: boolean;
  tier?: BadgeTier;
  onClick: () => void;
}

function TierChip({ label, active, tier, onClick }: TierChipProps) {
  const tierCfg = tier ? TIER_CONFIG[tier] : null;

  const activeClasses = tierCfg
    ? tierCfg.chipActive
    : "bg-background text-foreground shadow-xs font-semibold";

  return (
    <Button
      type="button"
      size="sm"
      variant="ghost"
      onClick={onClick}
      aria-pressed={active}
      data-testid={`badge-tier-chip-${label.toLowerCase()}`}
      className={`h-8 rounded-lg text-xs font-medium transition-all ${
        active
          ? activeClasses
          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
      }`}
    >
      {label}
    </Button>
  );
}

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
