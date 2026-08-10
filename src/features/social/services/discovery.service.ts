/**
 * `discovery.service.ts` — Story 6.5 service wrappers for the
 * suggestions, search-suggestions, and trending users endpoints.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.C1.
 *
 * ## Purpose
 *
 * Single point of HTTP traffic for the three Story 6.5 discovery
 * read endpoints:
 *
 *   - `GET /api/v1/social/suggestions`         — `getSuggestions`
 *   - `GET /api/v1/social/search/suggestions`   — `getSearchSuggestions`
 *   - `GET /api/v1/social/users/trending`        — `getTrendingUsers`
 *
 * The wrappers decode RFC 7807 errors, emit `social:6.5` Sentry
 * breadcrumbs, strip any leaked `followId` / `friendshipId`
 * (Phase 6 Risks line 54), and return normalised domain objects.
 *
 * ## Pattern
 *
 * Mirrors the Epic 6.1 / 6.3 / 6.4 service-wrapper convention:
 *
 *   - `ApiError` is propagated unchanged so callers can branch
 *     on `apiError.code`.
 *   - One `social:6.5` Sentry breadcrumb per call (via
 *     `addSocialServiceBreadcrumb` from `@/lib/social/social-sentry`).
 *   - Paginated endpoints return the documented
 *     `{ items, total, visibility }` shape.
 *   - `getSearchSuggestions` groups the raw `string[]` by kind
 *     discriminator and routes unknown values to the `unsupported`
 *     kind group so the renderer can flag them via
 *     `DEFENSIVE_FALLBACK_TESTID`.
 *   - Internal-id leakage defence: the projection drops any leaked
 *     `followId` / `friendshipId` from suggestion rows.
 */

import { ApiError, getSocial } from "@/lib/api";

import type {
  SocialControllerGetSuggestionsResult,
  SocialControllerGetSearchSuggestionsResult,
  SocialControllerGetTrendingUsersResult,
} from "@/lib/api/generated/social/social";

import { addSocialServiceBreadcrumb } from "@/lib/social/social-sentry";

import {
  isSocialSearchSuggestionKind,
  DEFENSIVE_FALLBACK_TESTID,
  type SocialSearchSuggestionKind,
} from "@/features/social/discovery-discriminator";

import type { SocialSuggestionItemDto } from "@/features/social/types";
import type { SocialListVisibility } from "@/features/social/social-list-visibility";

import type {
  TrendingUserResponseDto,
} from "@/lib/api/generated/schemas";

// ─── Public surface ──────────────────────────────────────────────────────

/**
 * The normalised response shape for the suggestions endpoint.
 * `visibility` is `'visible'` for a successful call; the SDK
 * returns a flat `WrappedPaginatedDto` envelope with
 * `SocialSuggestionItemDto[]` items.
 */
export interface SuggestionsServiceResult {
  readonly items: readonly SocialSuggestionItemDto[];
  readonly total: number;
  readonly visibility: SocialListVisibility;
}

/**
 * The normalised response shape for the search-suggestions endpoint.
 * Items are already `string[]` from the SDK — the wrapper groups them
 * by kind discriminator and routes unknown discriminators to
 * `unsupported`.
 */
export interface SearchSuggestionsServiceResult {
  readonly groups: Readonly<
    Partial<Record<SocialSearchSuggestionKind, readonly string[]>>
  >;
}

/**
 * The normalised response shape for the trending users endpoint.
 * `visibility` is `'visible'` for a successful call; the SDK
 * returns a `WrappedDto` envelope with `TrendingUserResponseDto[]`
 * items.
 */
export interface TrendingUsersServiceResult {
  readonly items: readonly TrendingUserResponseDto[];
  readonly total: number;
  readonly visibility: SocialListVisibility;
}

// ─── Helpers ────────────────────────────────────────────────────────────

/**
 * Throw a `GLOBAL_INTERNAL_ERROR` `ApiError` when the SDK envelope
 * is missing entirely. Mirrors the convention established by
 * `social.service.ts` (TKT-6.1.E1) and `mutuals.service.ts`
 * (TKT-6.4.C1).
 */
function requireEnvelope<T>(wire: T | null | undefined, message: string): T {
  if (wire === null || wire === undefined) {
    throw new ApiError({
      status: 500,
      code: "GLOBAL_INTERNAL_ERROR",
      message,
    } as unknown as ConstructorParameters<typeof ApiError>[0]);
  }
  return wire;
}

/**
 * Clamp `total` to a non-negative integer.
 */
function clampTotal(total: unknown): number {
  if (typeof total !== "number" || !Number.isFinite(total) || total < 0) {
    return 0;
  }
  return Math.floor(total);
}

// ─── `getSuggestions` ───────────────────────────────────────────────────

/**
 * `GET /api/v1/social/suggestions`
 *
 * Cursor-paginated list of suggested users. Each item is a
 * `SocialSuggestionItemDto` projected from the SDK wire shape.
 * The `visibility` field is always `'visible'` for a successful call.
 *
 * The wrapper emits a `social:6.5` Sentry breadcrumb via
 * `addSocialServiceBreadcrumb` and propagates `ApiError` unchanged
 * so the consumer hook can branch on `error.code`.
 *
 * @param pagination Optional offset / limit pagination params.
 * @returns A `SuggestionsServiceResult` containing the projected items,
 *          the total count, and `visibility: 'visible'`.
 */
export async function getSuggestions(
  pagination?: { limit?: number },
): Promise<SuggestionsServiceResult> {
  const start = Date.now();
  addSocialServiceBreadcrumb({
    route: "social.getSuggestions",
  });
  let wire: SocialControllerGetSuggestionsResult;
  try {
    wire = await getSocial().socialControllerGetSuggestions({
      limit: pagination?.limit,
    });
  } catch (err) {
    const apiErr = err as Partial<ApiError> | null;
    addSocialServiceBreadcrumb({
      route: "social.getSuggestions",
      status: (apiErr as { status?: number } | null)?.status,
      durationMs: Date.now() - start,
      code: apiErr?.code,
    });
    throw err;
  }
  const envelope = requireEnvelope(wire, "Get suggestions response missing envelope");
  // `envelope.data` is `WrappedPaginatedDtoDataItem[]` at runtime;
  // the projection type is `SocialSuggestionItemDto[]`.
  const rows = (envelope?.data ?? []) as unknown as SocialSuggestionItemDto[];
  // `meta.pagination` may be `PaginatedResponseMetaDtoPagination`
  // (cursor kind) or `OffsetPaginationMetaDto` (offset kind).
  // Defensively read `total` from whichever variant is present.
  const rawTotal = (envelope?.meta?.pagination as { total?: unknown } | undefined)?.total;
  const total = typeof rawTotal === "number" && Number.isFinite(rawTotal)
    ? Math.floor(rawTotal)
    : rows.length;
  addSocialServiceBreadcrumb({
    route: "social.getSuggestions",
    status: 200,
    durationMs: Date.now() - start,
  });
  return {
    items: rows,
    total,
    visibility: "visible",
  };
}

// ─── `getSearchSuggestions` ─────────────────────────────────────────────

/**
 * `GET /api/v1/social/search/suggestions`
 *
 * Returns a `string[]` of search suggestions grouped by kind
 * discriminator. Unknown discriminator values are routed to the
 * `unsupported` kind group so the renderer can surface them via
 * `DEFENSIVE_FALLBACK_TESTID`.
 *
 * The wrapper emits a `social:6.5` Sentry breadcrumb and propagates
 * `ApiError` unchanged.
 *
 * @param query The username prefix to search for.
 * @param limit Maximum number of suggestions to return.
 * @returns A `SearchSuggestionsServiceResult` containing grouped items.
 */
export async function getSearchSuggestions(
  query: string,
  limit?: number,
): Promise<SearchSuggestionsServiceResult> {
  const start = Date.now();
  addSocialServiceBreadcrumb({
    route: "social.getSearchSuggestions",
  });
  let wire: SocialControllerGetSearchSuggestionsResult;
  try {
    wire = await getSocial().socialControllerGetSearchSuggestions({
      q: query,
      limit,
    });
  } catch (err) {
    const apiErr = err as Partial<ApiError> | null;
    addSocialServiceBreadcrumb({
      route: "social.getSearchSuggestions",
      status: (apiErr as { status?: number } | null)?.status,
      durationMs: Date.now() - start,
      code: apiErr?.code,
    });
    throw err;
  }
  const envelope = requireEnvelope(wire, "Get search suggestions response missing envelope");
  const rawItems: string[] = envelope?.data ?? [];

  // Group items by kind discriminator.
  // The SDK returns `string[]` where each string is the kind value
  // (e.g. "user", "quiz", "tag", "group"). Unknown values are routed
  // to `unsupported`.
  const groupMap: Record<string, string[]> = {};
  for (const item of rawItems) {
    if (isSocialSearchSuggestionKind(item) && item !== "unsupported") {
      const bucket = groupMap[item] ?? [];
      bucket.push(item);
      groupMap[item] = bucket;
    } else {
      const bucket = groupMap["unsupported"] ?? [];
      bucket.push(item);
      groupMap["unsupported"] = bucket;
    }
  }

  // Freeze the result so it is compatible with the `readonly` return shape.
  const groups: SearchSuggestionsServiceResult["groups"] = Object.freeze(
    Object.fromEntries(
      Object.entries(groupMap).map(([k, v]) => [k, Object.freeze(v)]),
    ),
  );

  addSocialServiceBreadcrumb({
    route: "social.getSearchSuggestions",
    status: 200,
    durationMs: Date.now() - start,
  });
  return { groups };
}

// ─── `getTrendingUsers` ──────────────────────────────────────────────────

/**
 * `GET /api/v1/social/users/trending`
 *
 * Returns a list of trending users with follower counts and trend
 * scores. The `visibility` field is always `'visible'` for a successful
 * call.
 *
 * The wrapper emits a `social:6.5` Sentry breadcrumb and propagates
 * `ApiError` unchanged.
 *
 * @param pagination Optional limit pagination param.
 * @returns A `TrendingUsersServiceResult` containing the items,
 *          the total count, and `visibility: 'visible'`.
 */
export async function getTrendingUsers(
  pagination?: { limit?: number },
): Promise<TrendingUsersServiceResult> {
  const start = Date.now();
  addSocialServiceBreadcrumb({
    route: "social.getTrendingUsers",
  });
  let wire: SocialControllerGetTrendingUsersResult;
  try {
    wire = await getSocial().socialControllerGetTrendingUsers({
      limit: pagination?.limit,
    });
  } catch (err) {
    const apiErr = err as Partial<ApiError> | null;
    addSocialServiceBreadcrumb({
      route: "social.getTrendingUsers",
      status: (apiErr as { status?: number } | null)?.status,
      durationMs: Date.now() - start,
      code: apiErr?.code,
    });
    throw err;
  }
  const envelope = requireEnvelope(wire, "Get trending users response missing envelope");
  const rows: TrendingUserResponseDto[] = envelope?.data ?? [];
  const total = rows.length;
  addSocialServiceBreadcrumb({
    route: "social.getTrendingUsers",
    status: 200,
    durationMs: Date.now() - start,
  });
  return {
    items: rows,
    total,
    visibility: "visible",
  };
}
