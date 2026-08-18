

import type {
BadgeCatalogItemResponseDto,
BadgeDetailsResponseDto,
MyBadgeItemDto,
PublicAchievementProfileResponseDto,
AchievementHistoryItemResponseDto,
OffsetPaginationMetaDto,
} from "@/lib/api/generated/schemas";

import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

export type BadgeTier =
| "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND";

export type BadgeCategory =
| "PARTICIPATION"
  | "PERFORMANCE"
  | "STREAK"
  | "TOURNAMENT"
  | "SOCIAL"
  | "SPECIAL";

export type BadgeStatus = "available" | "in_progress" | "earned" | "revoked";

export interface BadgeCatalogFilters {

tier?: BadgeTier;

category?: BadgeCategory;
}

export interface AchievementHistoryFilters {

page?: number;

limit?: number;

category?: BadgeCategory;
}

export const DEFAULT_BADGE_CATALOG_FILTERS: BadgeCatalogFilters = {
tier: undefined,
category: undefined,
};

export const DEFAULT_ACHIEVEMENT_HISTORY_FILTERS: AchievementHistoryFilters = {
page: undefined,
limit: undefined,
category: undefined,
};

export interface AchievementHistoryPage {
items: readonly AchievementHistoryEntry[];
page: number;
total: number;
hasMore: boolean;
limit: number;
}

export type BadgeSummary = {
id: string;
code: string;
name: string;
description: string | null;
tier: BadgeTier;
totalEarned: number;
};

export type BadgeDetail = {
id: string;
code: string;
name: string;
description: string | null;
tier: BadgeTier;
totalEarned: number;

deprecated: boolean;
};

export type EarnedBadge = {
id: string;
code: string;
name: string;
description: string | null;
tier: BadgeTier;
earnedAt: string;

progress?: BadgeProgress;
};

export type BadgeProgress = {
code: string;
current: number;
target: number;
percent: number;
isComplete: boolean;
};

export type AchievementHistoryEntry = {
id: string;
code: string;
name: string;
tier: BadgeTier;
earnedAt: string;

category?: BadgeCategory;

source?: "attempt" | "tournament" | "social" | "system";
};

export type UserBadgeProfile = {
userId: string;
totalBadges: number;
rareBadges: number;
highestRank: number | null;

featuredBadges: EarnedBadge[];
};

export type AchievementErrorCode =
| "BADGE_NOT_FOUND"
  | "BADGE_HIDDEN"
  | "BADGE_DEFERRED"
  | "ACHIEVEMENT_FORBIDDEN"
  | "ACHIEVEMENT_RATE_LIMITED"
  | "ACHIEVEMENT_SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "GLOBAL_INTERNAL_ERROR";

export function rarityToTier(rarity: string | null | undefined): BadgeTier {
if (typeof rarity !== "string") return "BRONZE";
const upper = rarity.toUpperCase();
if (upper === "LEGENDARY" || upper === "DIAMOND") return "DIAMOND";
if (upper === "EPIC" || upper === "PLATINUM") return "PLATINUM";
if (upper === "RARE" || upper === "GOLD") return "GOLD";
if (upper === "UNCOMMON" || upper === "SILVER") return "SILVER";
return "BRONZE";
}

export function toBadgeSummary(
wire: NormalizedBadge | BadgeCatalogItemResponseDto | null | undefined,
): BadgeSummary {
if (!wire) {
return {
id: "",
code: "",
name: "",
description: null,
tier: "BRONZE",
totalEarned: 0,
    };
  }
const record = wire as Record<string, unknown>;
const id = typeof record.id === "string" ? record.id : "";
const code = typeof record.code === "string"
? record.code
: (typeof record.badgeId === "string" ? record.badgeId : id);
const name = typeof record.name === "string" ? record.name : "";
const description =
typeof record.description === "string" ? record.description : null;
const rarity = typeof record.rarity === "string" ? record.rarity : null;
const earnedCountRaw = record.earnedCount;
const totalEarned =
typeof earnedCountRaw === "number" ? earnedCountRaw : 0;
return {
id,
code,
name,
description,
tier: rarityToTier(rarity),
totalEarned,
  };
}

export function toBadgeDetail(
wire: BadgeDetailsResponseDto | null | undefined,
options: { deprecated?: boolean } = {},
): BadgeDetail | null {
if (!wire) return null;
const deprecated = options.deprecated ?? false;
return {
id: wire.id,
code: wire.id,
name: wire.name,
description: wire.description,
tier: rarityToTier(wire.rarity),
totalEarned: wire.earnedCount,
deprecated,
  };
}

export function toEarnedBadge(
wire:
| MyBadgeItemDto
    | NormalizedBadge
    | Record<string, unknown>
    | null
    | undefined,
progress?: BadgeProgress | null,
): EarnedBadge | null {
if (!wire) return null;
const record = wire as Record<string, unknown>;
const id = typeof record.id === "string" ? record.id : "";
const code = typeof record.code === "string"
? record.code
: (typeof record.badgeId === "string" ? record.badgeId : id);
const name = typeof record.name === "string" ? record.name : "";
const description =
typeof record.description === "string" ? record.description : null;
const rarity = typeof record.rarity === "string" ? record.rarity : null;
const earnedAt = typeof record.earnedAt === "string" ? record.earnedAt : "";
const earned: EarnedBadge = {
id,
code,
name,
description,
tier: rarityToTier(rarity),
earnedAt,
  };
if (progress) earned.progress = progress;
return earned;
}

export function toUserBadgeProfile(
wire: PublicAchievementProfileResponseDto | null | undefined,
): UserBadgeProfile | null {
if (!wire) return null;
const featuredBadges: EarnedBadge[] = (wire.featuredBadges ?? []).flatMap(
(entry): EarnedBadge[] => {
const earned = toEarnedBadge({
badgeId: entry.badgeId,
name: entry.badgeName,
rarity: entry.rarity,
earnedAt: "",
      });
return earned ? [earned] : [];
    },
  );
return {
userId: wire.userId,
totalBadges: wire.totalBadges,
rareBadges: wire.rareBadges,
highestRank: wire.highestRank,
featuredBadges,
  };
}

export function toAchievementHistoryEntry(
wire: AchievementHistoryItemResponseDto,
): AchievementHistoryEntry {
return {
id: wire.badgeId,
code: wire.badgeId,
name: wire.badgeName,
tier: rarityToTier(null),
earnedAt: wire.earnedAt,
  };
}

export function toAchievementHistoryPage(
items: readonly AchievementHistoryItemResponseDto[],
pagination: OffsetPaginationMetaDto | null | undefined,
fallbackLimit: number,
): AchievementHistoryPage {
const page = pagination?.page ?? 1;
const limit = pagination?.limit ?? fallbackLimit;
const total = pagination?.total ?? items.length;
const hasMore = pagination?.hasMore ?? false;
return {
items: items.map(toAchievementHistoryEntry),
page,
total,
hasMore,
limit,
  };
}

export const ACHIEVEMENT_CACHE_KEYS = {

catalog(filters: BadgeCatalogFilters = DEFAULT_BADGE_CATALOG_FILTERS) {
return [
"achievements",
"catalog",
filters.tier ?? "all",
filters.category ?? "all",
    ] as const;
  },

detail(code: string) {
return ["achievements", "badge", code] as const;
  },

myBadges() {
return ["achievements", "me", "badges"] as const;
  },

userBadges(userId: string) {
return ["achievements", "user", userId, "badges"] as const;
  },

history(filters: AchievementHistoryFilters = DEFAULT_ACHIEVEMENT_HISTORY_FILTERS) {
return [
"achievements",
"me",
"history",
filters.page ?? 1,
filters.limit ?? -1,
filters.category ?? "all",
    ] as const;
  },
} as const;

export interface AchievementInvalidationKeys {
catalog: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.catalog>;
myBadges: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.myBadges>;
history: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.history>;
detail: (code: string) => ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.detail>;
}

export function makeAchievementInvalidationKeys(): AchievementInvalidationKeys {
return {
catalog: ACHIEVEMENT_CACHE_KEYS.catalog(),
myBadges: ACHIEVEMENT_CACHE_KEYS.myBadges(),
history: ACHIEVEMENT_CACHE_KEYS.history(),
detail: (code) => ACHIEVEMENT_CACHE_KEYS.detail(code),
  };
}