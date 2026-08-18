"use client";

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

const TIER_COLOR: Record<BadgeTier, string> = {
BRONZE: "text-amber-700",
SILVER: "text-slate-500",
GOLD: "text-yellow-500",
PLATINUM: "text-cyan-500",
DIAMOND: "text-violet-500",
};

export function BadgeGallery({
initialTier,

initialCategory,
className,
}: BadgeGalleryProps) {
const flagValue = getFeatureFlagValue("achievements_live");
const isFlagPlaceholder = flagValue === "placeholder";

const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

const tierFilter = parseTier(searchParams.get(QUERY_TIER)) ?? initialTier;

const categoryFilter = parseCategory(searchParams.get(QUERY_CATEGORY));

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