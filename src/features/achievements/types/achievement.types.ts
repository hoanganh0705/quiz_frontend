/**
 * `achievement.types.ts` — Story 5.5 achievement types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.5 — Ranking, leaderboards, milestones, and achievement surfaces.
 * Source ticket: TKT-5.5.A2.
 *
 * ## Purpose
 *
 * Single source of truth for the achievement domain types, filter
 * shapes, pagination result shapes, and SWR cache-key factories
 * consumed by every Story 5.5 achievement hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (`achievements.service.ts`). Components
 * consume badges only through the `normalizeBadgeArray` adapter from
 * Epic 5.1 — the typed shapes here extend the generated DTOs to add
 * `id` aliases for deduplication and to project the document
 * tier/category taxonomy for the UI.
 *
 * ## Bare-array handling
 *
 * The `listBadges` and `getMyBadges` service wrappers already apply
 * `normalizeBadgeArray` from Epic 5.1 `dto-adapters.ts`. Components
 * therefore never branch on whether the response is a bare array vs an
 * envelope — the adapter returns a stable `NormalizedBadge[]` shape.
 *
 * ## Deferred-badge discipline
 *
 * `BADGE_DEFERRED` is mapped to a typed error in the service layer
 * and surfaces here as a category, never as a status flag. UI copy
 * must never promise a deferred badge as earned; `BadgeStatus` is
 * derived exclusively from server-provided fields.
 *
 * ## Pagination kinds
 *
 * - Catalog: bare array (no pagination at this commit)
 * - Earned badges: bare array
 * - User public profile: bare array (featuredBadges)
 * - History: offset-based
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 */

import type {
  BadgeCatalogItemResponseDto,
  BadgeDetailsResponseDto,
  MyBadgeItemDto,
  PublicAchievementProfileResponseDto,
  AchievementHistoryItemResponseDto,
  OffsetPaginationMetaDto,
} from "@/lib/api/generated/schemas";

import type { NormalizedBadge } from "@/lib/realtime/dto-adapters";

// ─── Tier and category enums ─────────────────────────────────────────────

/**
 * Badge tier / rarity taxonomy.
 *
 * The current backend exposes `rarity` as a free-form `string`. The
 * UI groups badges by tier; the canonical mapping is:
 *
 *   - `'COMMON'`     — bronze
 *   - `'UNCOMMON'`   — silver
 *   - `'RARE'`       — gold
 *   - `'EPIC'`       — platinum
 *   - `'LEGENDARY'`  — diamond
 *
 * Unknown rarity values map to `'COMMON'` at the projection boundary.
 */
export type BadgeTier =
  | "BRONZE"
  | "SILVER"
  | "GOLD"
  | "PLATINUM"
  | "DIAMOND";

/**
 * Coarse badge category taxonomy.
 *
 * The current backend does not expose a category field; the UI
 * groups badges by `tier` only. The category union is reserved for
 * a future backend addition and is included here so consumers can
 * branch on category without re-importing the type.
 */
export type BadgeCategory =
  | "PARTICIPATION"
  | "PERFORMANCE"
  | "STREAK"
  | "TOURNAMENT"
  | "SOCIAL"
  | "SPECIAL";

/**
 * Status derived from server-provided fields.
 *
 * `'available'` is rendered for catalog entries the user has not yet
 * earned; `'in_progress'` is rendered when `BadgeProgress.percent`
 * is in `(0, 100)`; `'earned'` is rendered when the badge appears
 * in the user's earned-badges list; `'revoked'` is rendered when the
 * service returns a `BADGE_HIDDEN` typed error.
 */
export type BadgeStatus = "available" | "in_progress" | "earned" | "revoked";

// ─── Filter shapes ───────────────────────────────────────────────────────

/**
 * URL-syncable filter state for the badge catalog view.
 *
 * `tier` and `category` are optional; both default to "all" when
 * `undefined`. The catalog wire envelope is a bare array at this
 * commit so no `cursor` field is included.
 */
export interface BadgeCatalogFilters {
  /** Tier filter. `undefined` means "all tiers". */
  tier?: BadgeTier;
  /** Category filter. `undefined` means "all categories". */
  category?: BadgeCategory;
}

/**
 * Pagination filter for the achievement history list.
 *
 * History uses offset pagination (`OffsetPaginationMetaDto`).
 */
export interface AchievementHistoryFilters {
  /** 1-indexed page number. `undefined` means "first page". */
  page?: number;
  /** Optional per-page limit. */
  limit?: number;
  /** Optional category filter. */
  category?: BadgeCategory;
}

// ─── Default filter values ───────────────────────────────────────────────

/**
 * Default filter state for the catalog view.
 */
export const DEFAULT_BADGE_CATALOG_FILTERS: BadgeCatalogFilters = {
  tier: undefined,
  category: undefined,
};

/**
 * Default filter state for the history view.
 */
export const DEFAULT_ACHIEVEMENT_HISTORY_FILTERS: AchievementHistoryFilters = {
  page: undefined,
  limit: undefined,
  category: undefined,
};

// ─── Page shapes ─────────────────────────────────────────────────────────

/**
 * Offset-pagination result shape for the achievement history.
 */
export interface AchievementHistoryPage {
  items: readonly AchievementHistoryEntry[];
  page: number;
  total: number;
  hasMore: boolean;
  limit: number;
}

// ─── Domain types ────────────────────────────────────────────────────────

/**
 * Catalog-view badge summary.
 *
 * Extends the generated `BadgeCatalogItemResponseDto` with an `id`
 * alias and a projected `tier` field. The catalog wire envelope is a
 * bare array; the service layer applies `normalizeBadgeArray` so the
 * source data is `NormalizedBadge` for the catalog read path. The
 * helper `toBadgeSummary` projects from either shape to this
 * projection.
 */
export type BadgeSummary = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: BadgeTier;
  totalEarned: number;
};

/**
 * Badge detail.
 *
 * Extends the generated `BadgeDetailsResponseDto` with `deprecated`
 * (tombstone view), `code`, `tier`, and an `id` alias. The detail
 * endpoint returns the same shape as the catalog item plus an
 * `earnedCount` field; `deprecated` is sourced from
 * `BADGE_HIDDEN` typed errors, not from a server field, because the
 * current DTO does not carry a `deprecated` flag.
 */
export type BadgeDetail = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: BadgeTier;
  totalEarned: number;
  /** True when the badge was hidden/deleted; UI renders a tombstone. */
  deprecated: boolean;
};

/**
 * Earned badge.
 *
 * Extends the generated `MyBadgeItemDto` with `code`, `tier`, and an
 * `id` alias. `progress` is optional; it is present when the backend
 * exposes progress for an in-progress badge.
 */
export type EarnedBadge = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  tier: BadgeTier;
  earnedAt: string;
  /** Informational progress; never promise completion when `percent < 100`. */
  progress?: BadgeProgress;
};

/**
 * Informational badge progress.
 *
 * Mirrors `BadgeProgressResponseDto`. Used to render an
 * informational progress bar on `EarnedBadgeList`; the UI never
 * promises the badge as earned when `percent < 100`.
 */
export type BadgeProgress = {
  code: string;
  current: number;
  target: number;
  percent: number;
  isComplete: boolean;
};

/**
 * Achievement history entry.
 *
 * Extends the generated `AchievementHistoryItemResponseDto` with an
 * `id` alias (from `badgeId`) and a `tier` projection. The `category`
 * and `source` fields are reserved for future backend additions.
 */
export type AchievementHistoryEntry = {
  id: string;
  code: string;
  name: string;
  tier: BadgeTier;
  earnedAt: string;
  /** Reserved for future backend field. */
  category?: BadgeCategory;
  /** Reserved for future backend field. */
  source?: "attempt" | "tournament" | "social" | "system";
};

/**
 * Public user badge profile.
 *
 * Mirrors the generated `PublicAchievementProfileResponseDto`. Privacy
 * is sourced from the server response: the current DTO does not
 * carry an `isPrivate` flag, so the UI renders the profile when the
 * response is non-null and renders a privacy-aware empty state when
 * the service throws `ACHIEVEMENT_FORBIDDEN`.
 */
export type UserBadgeProfile = {
  userId: string;
  totalBadges: number;
  rareBadges: number;
  highestRank: number | null;
  /** Featured badges prioritized by rarity; rendered in `UserEarnedBadgeStrip`. */
  featuredBadges: EarnedBadge[];
};

// ─── Error taxonomy ──────────────────────────────────────────────────────

/**
 * Typed `AchievementErrorCode` union.
 *
 * Components branch on `apiError.code === AchievementErrorCode`; HTTP
 * status is never inspected. `BADGE_DEFERRED` and `BADGE_HIDDEN` are
 * mapped here so the UI can render informational/tombstone copy
 * without claiming the badge as earned.
 */
export type AchievementErrorCode =
  | "BADGE_NOT_FOUND"
  | "BADGE_HIDDEN"
  | "BADGE_DEFERRED"
  | "ACHIEVEMENT_FORBIDDEN"
  | "ACHIEVEMENT_RATE_LIMITED"
  | "ACHIEVEMENT_SERVICE_UNAVAILABLE"
  | "UNAUTHORIZED"
  | "GLOBAL_INTERNAL_ERROR";

// ─── Tier projection ─────────────────────────────────────────────────────

/**
 * Best-effort mapping from the backend's free-form `rarity` string
 * to the documented `BadgeTier` taxonomy.
 *
 * Unknown values map to `'BRONZE'` (the closest analogue to the
 * legacy `COMMON` tier). Callers should not branch on the input —
 * the helper is total.
 */
export function rarityToTier(rarity: string | null | undefined): BadgeTier {
  if (typeof rarity !== "string") return "BRONZE";
  const upper = rarity.toUpperCase();
  if (upper === "LEGENDARY" || upper === "DIAMOND") return "DIAMOND";
  if (upper === "EPIC" || upper === "PLATINUM") return "PLATINUM";
  if (upper === "RARE" || upper === "GOLD") return "GOLD";
  if (upper === "UNCOMMON" || upper === "SILVER") return "SILVER";
  return "BRONZE";
}

// ─── Wire → feature projection helpers ───────────────────────────────────

/**
 * Project a catalog wire entry to `BadgeSummary`.
 *
 * The wire entry may be a `NormalizedBadge` (post-`normalizeBadgeArray`)
 * or the raw `BadgeCatalogItemResponseDto`. The helper is total:
 * missing fields fall back to documented defaults.
 */
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

/**
 * Project a detail wire entry to `BadgeDetail`.
 *
 * `deprecated` is reserved for hidden/deleted badges — the UI renders
 * a tombstone view when `deprecated === true`. The current DTO does
 * not expose this field; the caller (the hook) sets it from a
 * `BADGE_HIDDEN` typed error before returning.
 */
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

/**
 * Project an earned-badge wire entry to `EarnedBadge`.
 *
 * Accepts any `Record<string, unknown>` shape (the wire entry, a
 * `NormalizedBadge`, or a synthetic object built from the public
 * profile's `featuredBadges`) so callers never have to construct a
 * full `MyBadgeItemDto` shape manually.
 *
 * `progress` is optional; the caller (the hook) joins progress data
 * from `getMyBadgeProgress` when available.
 */
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

/**
 * Project a public user-profile wire entry to `UserBadgeProfile`.
 *
 * `featuredBadges` are projected to `EarnedBadge[]` so the user-profile
 * embed can render the same component the personal earned-badges
 * surface renders.
 */
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

/**
 * Project a history wire entry to `AchievementHistoryEntry`.
 *
 * `id` is aliased from `badgeId` so SWR deduplication works. The
 * `category` and `source` fields are reserved for future backend
 * additions and are not populated at this commit.
 */
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

/**
 * Project the verified offset-pagination metadata to the
 * `AchievementHistoryPage` shape.
 */
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

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.5 achievement reads.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 */
export const ACHIEVEMENT_CACHE_KEYS = {
  /**
   * SWR key for the badge catalog.
   *
   * Scoped by the serialised filter shape so different filter
   * combinations do not collide.
   */
  catalog(filters: BadgeCatalogFilters = DEFAULT_BADGE_CATALOG_FILTERS) {
    return [
      "achievements",
      "catalog",
      filters.tier ?? "all",
      filters.category ?? "all",
    ] as const;
  },

  /**
   * SWR key for a single badge detail.
   */
  detail(code: string) {
    return ["achievements", "badge", code] as const;
  },

  /**
   * SWR key for the authenticated user's earned badges.
   */
  myBadges() {
    return ["achievements", "me", "badges"] as const;
  },

  /**
   * SWR key for a user's public earned badges.
   */
  userBadges(userId: string) {
    return ["achievements", "user", userId, "badges"] as const;
  },

  /**
   * SWR key for the authenticated user's achievement history.
   *
   * History uses offset pagination, so the key includes the page
   * number and the category filter.
   */
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

/**
 * Invalidation key set for cross-event SWR revalidation.
 *
 * The notification-driven revalidation bridge mutates these keys
 * when a `notification.sent` event with `type === 'achievement'`
 * arrives. The set is documented as an object so additional keys can
 * be added without changing call sites.
 */
export interface AchievementInvalidationKeys {
  catalog: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.catalog>;
  myBadges: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.myBadges>;
  history: ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.history>;
  detail: (code: string) => ReturnType<typeof ACHIEVEMENT_CACHE_KEYS.detail>;
}

/**
 * Returns the full invalidation-key set for achievement revalidation.
 *
 * Centralised so the notification/event bridges and the hook agree
 * on the keys to mutate. `detail` is a function so callers can
 * invalidate the affected badge detail key without iterating the
 * full catalog.
 */
export function makeAchievementInvalidationKeys(): AchievementInvalidationKeys {
  return {
    catalog: ACHIEVEMENT_CACHE_KEYS.catalog(),
    myBadges: ACHIEVEMENT_CACHE_KEYS.myBadges(),
    history: ACHIEVEMENT_CACHE_KEYS.history(),
    detail: (code) => ACHIEVEMENT_CACHE_KEYS.detail(code),
  };
}