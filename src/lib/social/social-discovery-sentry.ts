/**
 * `social-discovery-sentry.ts` — Phase 6.5 Sentry breadcrumb helpers.
 *
 * Source epic:   Epic 6.5 — Social Discovery: Suggestions, Search
 *                Suggestions, User Search, Trending.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.5 (lines 261–301).
 * Source ticket: TKT-6.5.H1.
 *
 * ## Purpose
 *
 * Centralised helpers for the `social:6.5` Sentry breadcrumb
 * category that every Story 6.5 discovery and search service wrapper,
 * read hook, and page component emits. The helpers in this file are
 * the **only** functions the Story 6.5 surfaces use to emit breadcrumbs;
 * the `phase-lint-invariants` script asserts that no caller bypasses them.
 *
 * The breadcrumb payload shapes are locked by the Phase 6.5 telemetry
 * contract:
 *
 * ```ts
 * // Discovery breadcrumb
 * {
 *   category: "social:6.5",
 *   data: {
 *     route: "social.getSuggestions" | "social.getTrendingUsers" | "social.getSearchSuggestions",
 *     kind: "suggestions" | "trending" | "search-suggestions",
 *     surface?: "suggestions-page" | "trending-page",
 *     normalizedQueryLength?: number,
 *     offset?: number,
 *     limit?: number,
 *     total?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     epic: "1.0.0",
 *   }
 * }
 *
 * // Search breadcrumb
 * {
 *   category: "social:6.5",
 *   data: {
 *     route: "social.searchUsers",
 *     surface: "global-search-bar" | "social-search-page",
 *     normalizedQueryLength: number,
 *     offset?: number,
 *     limit?: number,
 *     total?: number,
 *     cooldownSeconds?: number,
 *     status: number | undefined,
 *     durationMs: number | undefined,
 *     code?: string,
 *     reason?: string,
 *     epic: "1.0.0",
 *   }
 * }
 * ```
 *
 * ## Key design decisions
 *
 * 1. **Normalized query length only**: The helpers accept
 *    `normalizedQueryLength: number` instead of raw query strings.
 *    This prevents PII / query content from being logged.
 * 2. **Stable route names**: Route values are string literals derived
 *    from the SDK wrapper names, ensuring breadcrumb traces match the
 *    actual API calls.
 * 3. **Discriminated surfaces**: The `kind` and `surface` discriminators
 *    let the Sentry dashboard split discovery vs. search traffic.
 */

import * as Sentry from "@sentry/nextjs";

// ─── Constants ───────────────────────────────────────────────────────────

/**
 * The breadcrumb category for Epic 6.5 telemetry. Distinct from
 * the Epic 6.1 / 6.2 / 6.3 / 6.4 categories so the Sentry
 * dashboard can split the five epics' events.
 */
export const EPIC_6_5_BREADCRUMB_CATEGORY = "social:6.5" as const;

/**
 * The Epic 6.5 version. The epic-version is emitted as a
 * breadcrumb data field so the dashboard can split event
 * volumes by Phase 6 release-train.
 */
export const SOCIAL_EPIC_6_5_VERSION = "1.0.0" as const;

// ─── Stable route names ──────────────────────────────────────────────────

/**
 * The stable SDK function names the Story 6.5 discovery surfaces call.
 * Each value is also the documented Epic 6.5 wiring contract — it MUST
 * match the SDK wrapper name so a future regression that swaps the
 * wrapper for an inline fetch surfaces as a breadcrumb mismatch.
 */
export const SOCIAL_6_5_ROUTES = {
  getSuggestions: "social.getSuggestions",
  getTrendingUsers: "social.getTrendingUsers",
  getSearchSuggestions: "social.getSearchSuggestions",
  searchUsers: "social.searchUsers",
} as const;

export type Social65Route = (typeof SOCIAL_6_5_ROUTES)[keyof typeof SOCIAL_6_5_ROUTES];

// ─── Discovery helpers ────────────────────────────────────────────────────

/**
 * The discovery surface kinds for Epic 6.5.
 */
export type SocialDiscoveryKind = "suggestions" | "trending" | "search-suggestions";

/**
 * The discovery page surfaces for Epic 6.5.
 */
export type SocialDiscoverySurface = "suggestions-page" | "trending-page";

/**
 * The payload shape for a discovery-service breadcrumb. The fields are
 * the union of the documented Phase 6.5 telemetry contract for the
 * discovery surfaces (suggestions, trending, search suggestions).
 */
export interface SocialDiscoveryBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route:
    | typeof SOCIAL_6_5_ROUTES.getSuggestions
    | typeof SOCIAL_6_5_ROUTES.getTrendingUsers
    | typeof SOCIAL_6_5_ROUTES.getSearchSuggestions;
  /** The discovery surface kind. */
  kind: SocialDiscoveryKind;
  /** Optional page surface for suggestions / trending. */
  surface?: SocialDiscoverySurface;
  /**
   * The length of the normalized query string. Always a number;
   * never the raw query.
   */
  normalizedQueryLength?: number;
  /** The pagination offset. */
  offset?: number;
  /** The pagination limit. */
  limit?: number;
  /** The total number of entries reported by the surface. */
  total?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
}

/**
 * Emit a `social:6.5` breadcrumb for a discovery-service data fetch.
 *
 * @example
 *   addSocialDiscoveryBreadcrumb({
 *     route: "social.getSuggestions",
 *     kind: "suggestions",
 *     surface: "suggestions-page",
 *     total: 10,
 *     status: 200,
 *     durationMs: 45,
 *   });
 */
export function addSocialDiscoveryBreadcrumb(data: SocialDiscoveryBreadcrumbData): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    kind: data.kind,
    epic: SOCIAL_EPIC_6_5_VERSION,
  };
  if (data.surface !== undefined) payload.surface = data.surface;
  if (data.normalizedQueryLength !== undefined)
    payload.normalizedQueryLength = data.normalizedQueryLength;
  if (data.offset !== undefined) payload.offset = data.offset;
  if (data.limit !== undefined) payload.limit = data.limit;
  if (data.total !== undefined) payload.total = data.total;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;

  Sentry.addBreadcrumb({
    category: EPIC_6_5_BREADCRUMB_CATEGORY,
    data: payload,
  });
}

// ─── Search helpers ───────────────────────────────────────────────────────

/**
 * The search surfaces for Epic 6.5.
 */
export type SocialSearchSurface = "global-search-bar" | "social-search-page";

/**
 * The payload shape for a search-service breadcrumb. The fields are
 * the union of the documented Phase 6.5 telemetry contract for the
 * user search surface, including rate-limit signals.
 */
export interface SocialSearchBreadcrumbData {
  /** The stable SDK function name the breadcrumb describes. */
  route: typeof SOCIAL_6_5_ROUTES.searchUsers;
  /** The search surface the breadcrumb originates from. */
  surface: SocialSearchSurface;
  /**
   * The length of the normalized query string. Always a number;
   * never the raw query.
   */
  normalizedQueryLength: number;
  /** The pagination offset. */
  offset?: number;
  /** The pagination limit. */
  limit?: number;
  /** The total number of search results reported by the surface. */
  total?: number;
  /** The decoded cooldown, in seconds. `undefined` when not rate-limited. */
  cooldownSeconds?: number;
  /** The HTTP status. `undefined` while the request is in-flight. */
  status?: number;
  /** The measured call duration. `undefined` while in-flight. */
  durationMs?: number;
  /** The `ApiError.code` when an error occurred. */
  code?: string;
  /**
   * Optional UI-side reason code. Used for rate-limit or other
   * error-specific context.
   */
  reason?: string;
}

/**
 * Emit a `social:6.5` breadcrumb for a search-service data fetch.
 *
 * @example
 *   addSocialSearchBreadcrumb({
 *     route: "social.searchUsers",
 *     surface: "social-search-page",
 *     normalizedQueryLength: 5,
 *     total: 12,
 *     status: 200,
 *     durationMs: 67,
 *   });
 *
 * @example
 *   // Rate-limited search
 *   addSocialSearchBreadcrumb({
 *     route: "social.searchUsers",
 *     surface: "social-search-page",
 *     normalizedQueryLength: 3,
 *     cooldownSeconds: 30,
 *     code: "SOCIAL_SEARCH_RATE_LIMITED",
 *     reason: "rate_limit",
 *   });
 */
export function addSocialSearchBreadcrumb(data: SocialSearchBreadcrumbData): void {
  const payload: Record<string, string | number> = {
    route: data.route,
    surface: data.surface,
    normalizedQueryLength: data.normalizedQueryLength,
    epic: SOCIAL_EPIC_6_5_VERSION,
  };
  if (data.offset !== undefined) payload.offset = data.offset;
  if (data.limit !== undefined) payload.limit = data.limit;
  if (data.total !== undefined) payload.total = data.total;
  if (data.cooldownSeconds !== undefined)
    payload.cooldownSeconds = data.cooldownSeconds;
  if (data.status !== undefined) payload.status = data.status;
  if (data.durationMs !== undefined) payload.durationMs = data.durationMs;
  if (data.code !== undefined) payload.code = data.code;
  if (data.reason !== undefined) payload.reason = data.reason;

  Sentry.addBreadcrumb({
    category: EPIC_6_5_BREADCRUMB_CATEGORY,
    data: payload,
  });
}
