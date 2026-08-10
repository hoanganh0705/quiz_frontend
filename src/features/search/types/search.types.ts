/**
 * `search.types.ts` — Story 5.6 search types and cache key factories.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.A1.
 *
 * ## Purpose
 *
 * Single source of truth for the search domain types, query shape,
 * grouped result shape, per-kind result DTO projections, privacy/
 * visibility enum, error code union, query-state union, and SWR
 * cache-key factories consumed by every Story 5.6 hook and component.
 *
 * ## Type philosophy
 *
 * Types are feature-level projections of the verified service wrapper
 * outputs from Story 5.1 (`search.service.ts`). Per-kind DTOs extend the
 * generated SDK DTOs to add stable `id` aliases, `displayName`,
 * `subtitle?`, `href`, and `visibility` fields consumed by the result
 * card components. Hand-written backend models are forbidden.
 *
 * ## Cursor hygiene
 *
 * Cursor fields are treated as opaque. Components never decode or
 * construct cursors.
 *
 * ## Privacy-aware rendering
 *
 * Each result carries a `SearchVisibility` projection sourced from the
 * backend privacy/visibility contract. The frontend never infers
 * relationships from leaked unstable social identifiers.
 *
 * ## Stable URLs only
 *
 * Result DTOs expose only stable public IDs and slugs. Unstable social
 * identifiers (`followId`, `friendshipId`) must never appear on a
 * result DTO or in a rendered href.
 *
 * ## SWR cache key factories
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are safe
 * to call inside `useMemo` and `useEffect` dependency arrays.
 */

import type {
  SearchQuizResultDto,
  SearchUserResultDto,
  SearchTagResultDto,
  SearchCommentResultDto,
  SearchCategoryResultDto,
} from "@/lib/api/generated/schemas";

// ─── Result kind ──────────────────────────────────────────────────────────

/**
 * The set of result kinds surfaced by the unified search.
 *
 * The Phase 5 master plan §5.6 Story 5.6 ("Story 5.6 — Search and
 * Approved Read-Only Social Discovery Integration") requires that
 * `GET /search` return grouped results across supported resource
 * types. This union mirrors the kinds documented in the master plan.
 *
 * - `'quiz'`      — published quizzes (read-only summary DTO).
 * - `'user'`      — public user profiles (read-only summary DTO; never
 *                    includes follow / friend-request identifiers).
 * - `'tournament'`— tournament summaries surfaced via the Phase 5
 *                    tournament lane (Epic 5.2 DTO projection).
 * - `'achievement'` — badge summaries surfaced via the Phase 5
 *                    achievement lane (Epic 5.5 DTO projection).
 * - `'ranking'`   — ranking/leaderboard entry summaries surfaced via
 *                    the Phase 5 ranking lane (Epic 5.5 DTO projection).
 * - `'tag'`       — tag summaries (read-only).
 * - `'category'`  — category summaries (read-only).
 * - `'comment'`   — comment summaries (read-only; subject to the
 *                    visibility contract).
 * - `'social'`    — approved read-only social subsets (Epic 5.3
 *                    DTOs). This kind never carries write identifiers.
 */
export type SearchResultKind =
  | "quiz"
  | "user"
  | "tournament"
  | "achievement"
  | "ranking"
  | "tag"
  | "category"
  | "comment"
  | "social";

/**
 * Per-result privacy/visibility tier.
 *
 * Mirrors the backend privacy/visibility contract that ships with the
 * search response. The frontend never upgrades this tier locally —
 * private items are filtered out at render time, and authenticated-only
 * items surface a sign-in hint for anonymous viewers.
 *
 * - `'public'`        — visible to all viewers (signed-in or not).
 * - `'authenticated'` — visible only to signed-in viewers; anonymous
 *                       viewers see a sign-in hint instead of the row.
 * - `'private'`       — visible only to the owner / explicitly granted
 *                       viewers; never rendered to anyone else.
 */
export type SearchVisibility = "public" | "authenticated" | "private";

// ─── Query shape ──────────────────────────────────────────────────────────

/**
 * Query parameters for the unified search endpoint.
 *
 * `q` is the trimmed query string. The hook is responsible for
 * trimming whitespace before sending to the service. `limit` is
 * clamped to the documented backend maximum (20). `kinds` filters the
 * groups the caller wants; `undefined` returns every group.
 */
export interface SearchQueryParams {
  /** Trimmed search query. Minimum backend length: 2. */
  q: string;
  /** Per-section maximum. Clamped to 20 by the hook. */
  limit?: number;
  /** Optional subset of groups to return. `undefined` means all. */
  kinds?: SearchResultKind[];
}

/**
 * Default query parameters for the unified search.
 *
 * Centralised so the URL-sync hook, the page, and the URL initializer
 * agree on the empty query shape.
 */
export const DEFAULT_SEARCH_QUERY_PARAMS: SearchQueryParams = {
  q: "",
  limit: undefined,
  kinds: undefined,
};

// ─── Per-kind result DTOs ─────────────────────────────────────────────────

/**
 * Common fields every result-kind DTO exposes.
 *
 * `id` is the stable public identifier used by SWR deduplication and
 * by the rendered navigation href. `displayName` is the user-facing
 * title; `subtitle` is optional secondary text. `href` is the stable
 * destination URL — never includes `followId` or `friendshipId`.
 */
export interface BaseSearchResult {
  /** Stable public identifier (id alias for SWR deduplication). */
  id: string;
  /** User-facing primary title. */
  displayName: string;
  /** Optional secondary line shown below the title. */
  subtitle?: string;
  /** Stable destination href. No unstable social IDs. */
  href: string;
  /** Server-authoritative privacy tier. */
  visibility: SearchVisibility;
}

/**
 * Quiz result projection.
 *
 * Extends the generated `SearchQuizResultDto` with the standard
 * card-rendering fields. The `id` alias maps from `quizId` for SWR
 * deduplication.
 */
export type QuizResultDto = BaseSearchResult &
  Omit<SearchQuizResultDto, "quizId"> & {
    id: string;
  };

/**
 * User result projection.
 *
 * `href` uses the user's stable public identifier (slug or userId)
 * and never carries `followId` / `friendshipId`. Components must not
 * import social write DTOs alongside this type.
 */
export type UserResultDto = BaseSearchResult &
  Omit<SearchUserResultDto, "userId"> & {
    id: string;
  };

/**
 * Tournament result projection.
 *
 * The card navigation href uses the stable tournament public ID; no
 * write identifiers are exposed. Source DTOs come from Epic 5.2.
 */
export interface TournamentResultDto extends BaseSearchResult {
  id: string;
  /** Tournament lifecycle status. */
  status?: string;
  /** Participant count, if surfaced by the backend. */
  participantCount?: number;
}

/**
 * Achievement / badge result projection.
 *
 * The card navigation href uses the stable badge public ID. No
 * unlocked state is exposed beyond the server-authoritative summary.
 */
export interface AchievementResultDto extends BaseSearchResult {
  id: string;
  /** Optional tier or category label. */
  tier?: string;
}

/**
 * Ranking / leaderboard entry result projection.
 *
 * `href` uses the stable user profile identifier; no unstable social
 * IDs are surfaced. Source DTOs come from Epic 5.5.
 */
export interface RankingResultDto extends BaseSearchResult {
  id: string;
  /** Optional numeric rank, if surfaced by the backend. */
  rank?: number;
  /** Optional numeric score. */
  score?: number;
}

/**
 * Tag result projection.
 *
 * `id` aliases `tagId`. `href` is the stable `/tags/[slug]` route.
 */
export type TagResultDto = BaseSearchResult &
  Omit<SearchTagResultDto, "tagId"> & {
    id: string;
  };

/**
 * Category result projection.
 *
 * `id` aliases `categoryId`. `href` is the stable `/categories/[idOrSlug]`
 * route.
 */
export type CategoryResultDto = BaseSearchResult &
  Omit<SearchCategoryResultDto, "categoryId"> & {
    id: string;
  };

/**
 * Comment result projection.
 *
 * `id` aliases `commentId`. `href` resolves to the parent quiz's
 * `/quizzes/[idOrSlug]` deep-link, never an unstable social ID.
 */
export type CommentResultDto = BaseSearchResult &
  Omit<SearchCommentResultDto, "commentId"> & {
    id: string;
  };

/**
 * Approved read-only social result projection.
 *
 * Used for the social-read subset approved for Phase 5 (Epic 5.3 read
 * DTOs). The projection intentionally **does not** carry `followId`,
 * `friendshipId`, or any other write identifier. Cards rendered from
 * this DTO must not surface follow/friend-request CTAs (TKT-5.6.D4
 * invariant).
 */
export interface SocialReadResultDto extends BaseSearchResult {
  id: string;
  /** Public display name of the social entity (user, suggestion, …). */
  displayName: string;
  /** Optional avatar URL, gated by backend visibility. */
  avatarUrl?: string;
}

// ─── Group shape ──────────────────────────────────────────────────────────

/**
 * A single grouped result kind.
 *
 * Every result kind in the search response is wrapped in a `SearchGroup`
 * that carries the items, the visibility tier of the group, and the
 * kind label. The visibility tier is server-authoritative; the
 * frontend never overrides it.
 */
export interface SearchGroup<T> {
  /** The kind label. Matches `SearchResultKind`. */
  kind: SearchResultKind;
  /** Items in this group, ordered by relevance. */
  items: readonly T[];
  /** Server-authoritative visibility tier for the group. */
  visibility: SearchVisibility;
}

/**
 * Discriminated union over the supported per-kind `SearchGroup` shapes.
 *
 * Components branch on `group.kind` to render the correct per-kind
 * card variant. The union ensures components cannot accidentally
 * render a quiz card with user DTOs.
 */
export type SearchResultDto =
  | SearchGroup<QuizResultDto>
  | SearchGroup<UserResultDto>
  | SearchGroup<TournamentResultDto>
  | SearchGroup<AchievementResultDto>
  | SearchGroup<RankingResultDto>
  | SearchGroup<TagResultDto>
  | SearchGroup<CategoryResultDto>
  | SearchGroup<CommentResultDto>
  | SearchGroup<SocialReadResultDto>;

// ─── Response shape ───────────────────────────────────────────────────────

/**
 * Flattened search response.
 *
 * The wire-level `SearchResponseDto` is nested (one field per kind);
 * the feature-level projection flattens it to a `groups` record keyed
 * by `SearchResultKind`. Components read from the flat record.
 *
 * `tookMs` is optional telemetry surfaced by the backend; `cursor` is
 * the opaque pagination cursor for follow-up queries (search is
 * effectively cursor-less per the master plan, but the field is
 * reserved for future expansion).
 */
export interface SearchResponseDto {
  /** The query string echoed back as performed. */
  query: string;
  /** Flattened groups keyed by `SearchResultKind`. */
  groups: Partial<Record<SearchResultKind, SearchGroup<unknown>>>;
  /** Optional server-reported query duration. */
  tookMs?: number;
  /** Opaque pagination cursor. `undefined` means "no next page". */
  cursor?: string;
}

/**
 * Empty flat search response.
 *
 * Returned by `useSearch` when `search_live` is `'placeholder'` or
 * when the query is below the backend minimum length.
 */
export const EMPTY_SEARCH_RESPONSE: SearchResponseDto = {
  query: "",
  groups: {},
};

// ─── Error codes ──────────────────────────────────────────────────────────

/**
 * Error codes specific to the unified search surface.
 *
 * Components must branch on these codes using `getUserCopy` from
 * Epic 5.1 — never on HTTP `status`. The `SEARCH_*` codes are search
 * specific; the `UNAUTHORIZED` / `FORBIDDEN` / `GLOBAL_*` codes are
 * shared with the global RFC 7807 table.
 */
export type SearchErrorCode =
  | "SEARCH_QUERY_TOO_SHORT"
  | "SEARCH_QUERY_TOO_LONG"
  | "SEARCH_RATE_LIMITED"
  | "SEARCH_BACKEND_UNAVAILABLE"
  | "SEARCH_INVALID_QUERY"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "GLOBAL_VALIDATION_FAILED"
  | "GLOBAL_INTERNAL_ERROR";

// ─── Query state machine ──────────────────────────────────────────────────

/**
 * Local query-state machine for the search hook.
 *
 * State transitions:
 *   idle → debouncing (on input change)
 *   debouncing → fetching (after the debounce delay)
 *   fetching → success (on success)
 *   fetching → error (on failure)
 *   fetching → stale (on success with cached previous data present
 *                  — preserved while a new query is in flight)
 *   success → fetching (on a new query)
 *   success → empty (on success with no groups)
 *   error → fetching (on retry)
 *
 * Mirrors the `RegistrationMutationState` / `NotificationMutationState`
 * pattern from earlier Phase 5 epics.
 */
export type SearchQueryState =
  | "idle"
  | "debouncing"
  | "fetching"
  | "success"
  | "stale"
  | "error"
  | "empty";

// ─── Serialisation ────────────────────────────────────────────────────────

/**
 * Serialize the search query parameters to a stable, URL-safe key fragment.
 *
 * Pure function used by `SEARCH_CACHE_KEYS.results` and the
 * URL-sync hook. Two equal parameter objects produce equal strings;
 * field order is fixed so the cache key never depends on object
 * insertion order.
 */
export function serializeSearchParams(params: SearchQueryParams): string {
  const parts: string[] = [];

  const trimmedQ = params.q.trim();
  if (trimmedQ.length > 0) {
    parts.push(`q=${trimmedQ.toLowerCase()}`);
  }
  if (typeof params.limit === "number") {
    parts.push(`limit=${params.limit}`);
  }
  if (Array.isArray(params.kinds) && params.kinds.length > 0) {
    // Sort the kinds so the cache key is stable regardless of input
    // order — callers may pass user-supplied orderings.
    const sortedKinds = [...params.kinds].sort();
    parts.push(`kinds=${sortedKinds.join(",")}`);
  }

  return parts.join("|");
}

/**
 * History entry shape persisted by `useSearchHistory`.
 *
 * Entries are simple `{ query, timestamp }` records with no IDs and
 * no unstable social identifiers. The shape is exported so the
 * session-storage serializer stays type-checked.
 */
export interface SearchHistoryEntry {
  /** Trimmed query string. Never contains unstable social IDs. */
  query: string;
  /** Epoch milliseconds when the entry was pushed. */
  timestamp: number;
}

// ─── SWR cache keys ──────────────────────────────────────────────────────

/**
 * SWR cache keys for the Story 5.6 search surfaces.
 *
 * Each factory returns a frozen tuple so equal inputs produce equal
 * keys. The factories are pure (no clock, no random) so they are
 * safe to call inside `useMemo` and `useEffect` dependency arrays.
 *
 * ## Invalidation strategy
 *
 * After a successful mutation that invalidates search results (e.g. a
 * quiz publish, a tournament registration, a ranking update), the
 * following keys must be invalidated:
 *
 *   1. `results` for every active `params` scoping
 *
 * Use `SEARCH_CACHE_KEYS.invalidateAllResults` to get a key shape
 * suitable for SWR's `mutate(() => true, undefined)` call.
 */
export const SEARCH_CACHE_KEYS = {
  /**
   * SWR key for the grouped search results.
   *
   * Scoped by the serialised query parameter shape so different
   * queries do not collide.
   */
  results(params: SearchQueryParams) {
    return ["search", "results", serializeSearchParams(params)] as const;
  },

  /**
   * SWR key for the per-user session-scoped search history.
   *
   * Singleton key (no user arg) — history is per-tab session.
   */
  history() {
    return ["search", "history", "session"] as const;
  },

  /**
   * Match-all-results key prefix used for SWR invalidation.
   *
   * Pairs with `mutate((key) => Array.isArray(key) && key[0] === 'search' && key[1] === 'results', undefined)`.
   */
  resultsPrefix() {
    return ["search", "results"] as const;
  },
} as const;

/**
 * Re-export the per-kind result DTOs and group/response shapes so
 * consumers can `import type { ... } from '@/features/search/types'`
 * from the barrel path. The aliases are re-exported as their original
 * names via the barrel — this comment documents the canonical import
 * shape without altering the exported names.
 *
 * Consumers should prefer:
 *
 *   import type {
 *     QuizResultDto,
 *     UserResultDto,
 *     TournamentResultDto,
 *     AchievementResultDto,
 *     RankingResultDto,
 *     TagResultDto,
 *     CategoryResultDto,
 *     CommentResultDto,
 *     SocialReadResultDto,
 *   } from '@/features/search/types';
 */