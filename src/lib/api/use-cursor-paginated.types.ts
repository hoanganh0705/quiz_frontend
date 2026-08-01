/**
 * Public TypeScript contract for the `useCursorPaginated` hook.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive (`useCursorPaginated`).
 * Source story:  PHASE_3_EPICS.md → Story 3.2, lines 183 + 235.
 * Source ticket: TKT-3.2.C1.
 *
 * This file is the single source of truth for the hook's public type
 * signature. The runtime implementation (D1) imports from here; every
 * consumer (Stories 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.10, 3.11, 3.12) and
 * the hook's test (D2) compile against this contract. A future "let's
 * make `error` be `unknown` again" change must update this file AND
 * the C2 type-level spec, which is the point of the discriminated
 * design: drift is caught at compile time, not at runtime.
 *
 * Conventions:
 *
 *   - The `paginationKind` option is a literal-string discriminator.
 *     When `'cursor'` is passed (or omitted — the default), the fetcher
 *     is narrowed to `CursorFetcher<T, P>`. When `'offset'`, the
 *     fetcher is narrowed to `OffsetFetcher<T, P>`. This is enforced
 *     by the `UseCursorPaginatedParams` discriminated union below.
 *   - The `error` field is typed `ApiError | null` (not `unknown`), per
 *     the cross-story contract rule on RFC 7807. The hook is the only
 *     place in Phase 3 that converts `AxiosError` → `ApiError`.
 *   - The result shape matches the Story 3.2 line 183 contract
 *     verbatim, in field name and order: `items`, `isLoading`,
 *     `isLoadingMore`, `hasMore`, `loadMore`, `error`, `refresh`.
 *     D5 adds an optional `retryBannerVisible` field; D6 adds nothing
 *     (the Sentry capture is a side-effect, not a state change); D7
 *     adds nothing (the SSR fallback is configured via params, not
 *     result).
 *
 * The file has no runtime code; it is a compile-only contract. The C2
 * spec (a `*.spec-d.ts` file under the same directory) locks the
 * discriminators and the field types.
 */

import type { ApiError } from "@/lib/api/core/ApiError";

// ---------------------------------------------------------------------------
// Wire-side types (consumed by fetchers; mirror the post-`unwrap` shape)
// ---------------------------------------------------------------------------

/**
 * Discriminator for the two pagination strategies the hook supports.
 *
 * - `'cursor'` — the default. The fetcher is called with `{ cursor, params }`
 *   and returns `{ items, nextCursor, hasNextPage, limit }`. Most
 *   Phase-3 endpoints are cursor-paginated (44 of 50 paginated endpoints
 *   in the OpenAPI spec — see `EPIC_3_2_A1.md` §6).
 *
 * - `'offset'` — the fallback. The fetcher is called with `{ page, params }`
 *   and returns `{ items, page, total, hasMore, limit }`. Out of Phase-3
 *   scope today (used by tournament / achievement / admin endpoints) but
 *   supported by the hook so the same primitive is reusable in later
 *   phases.
 */
export type PaginationKind = "cursor" | "offset";

/**
 * The inner value a cursor-paginated fetcher returns (post-`unwrap`,
 * i.e. the SDK has already removed the `{ data, meta }` envelope).
 *
 * Note: this is a wider type than the `CursorPage<T>` exported from
 * `src/lib/api/__fixtures__/cursor-pagination.ts` (which is the
 * fixture-builder's structural view); the field set is the same.
 */
export interface CursorPage<T extends { id: string }> {
  items: readonly T[];
  nextCursor: string | null;
  hasNextPage: boolean;
  limit: number;
}

/**
 * The inner value an offset-paginated fetcher returns.
 */
export interface OffsetPage<T extends { id: string }> {
  items: readonly T[];
  page: number;
  total: number;
  hasMore: boolean;
  limit: number;
}

// ---------------------------------------------------------------------------
// Fetcher signatures
// ---------------------------------------------------------------------------

/**
 * The optional second arg to a cursor fetcher. The `signal` is
 * forwarded by the hook on every call so the underlying SDK / axios
 * request can be aborted (Story 3.2 line 243 — component unmount and
 * race with `refresh`).
 */
export interface CursorFetcherArgs<P> {
  cursor: string | null;
  params: P;
  signal?: AbortSignal;
}

export interface OffsetFetcherArgs<P> {
  page: number;
  params: P;
  signal?: AbortSignal;
}

export type CursorFetcher<T extends { id: string }, P> = (
  args: CursorFetcherArgs<P>,
) => Promise<CursorPage<T>>;

export type OffsetFetcher<T extends { id: string }, P> = (
  args: OffsetFetcherArgs<P>,
) => Promise<OffsetPage<T>>;

// ---------------------------------------------------------------------------
// Per-mode params (discriminated by `paginationKind`)
// ---------------------------------------------------------------------------

/**
 * Shared fields every params shape has. The `paginationKind` is the
 * literal discriminator; the type system reads it to narrow the
 * `fetcher` field.
 *
 * The `key` is the SWR key — same semantics as `useSWR`'s key
 * (an array whose serialised form is the cache identity).
 *
 * The `fallbackData` field (D7) seeds the first page's items without
 * a network call. Useful for SSR — a server component prefetches
 * the first page and writes the result to a global; the client
 * hydrates from the global and does not re-fetch.
 *
 * `T extends { id: string }` is the constraint every paginated item
 * shape in this codebase satisfies. The `appendUniqueById` helper
 * (B1) used by the hook relies on it.
 */
interface BaseParams<T extends { id: string }> {
  key: readonly unknown[];
  paginationKind: PaginationKind;
  revalidateOnFocus?: boolean;
  fallbackData?: CursorPageFallbackData<T> | OffsetPageFallbackData<T>;
}

export interface CursorParams<
  T extends { id: string },
  P,
> extends BaseParams<T> {
  paginationKind: "cursor";
  fetcher: CursorFetcher<T, P>;
  params: P;
  /**
   * D6 — optional cursor-decode hook. Called for every non-null
   * `nextCursor` coming out of a page response, before the value is
   * used to fetch the next page. If `cursorDecoder` throws, the hook
   * captures the error via `captureException(surface: 'useCursorPaginated',
   * reason: 'cursor-decode')` and resets the cursor to `null` (forcing
   * a refetch from the first page).
   *
   * The default is `undefined` — no decode is performed and no Sentry
   * capture happens. The field is opt-in to keep the contract minimal
   * for endpoints whose cursors do not require validation.
   */
  cursorDecoder?: (cursor: string) => void;
}

export interface OffsetParams<
  T extends { id: string },
  P,
> extends BaseParams<T> {
  paginationKind: "offset";
  fetcher: OffsetFetcher<T, P>;
  params: P;
}

/**
 * Discriminated union of the two params shapes.
 *
 * The default `paginationKind` is `'cursor'` (the Story 3.2 dominant
 * case). To opt into offset, the caller writes
 * `{ paginationKind: 'offset', fetcher: <OffsetFetcher>, ... }`.
 */
export type UseCursorPaginatedParams<
  T extends { id: string },
  P,
> =
  | CursorParams<T, P>
  | OffsetParams<T, P>;

/**
 * Convenience overload so callers can omit `paginationKind` and get
 * the cursor branch by default. The implementation is a single
 * function below; TypeScript picks the matching overload at the call
 * site.
 */
export type UseCursorPaginatedDefaultParams<
  T extends { id: string },
  P,
> =
  | Omit<CursorParams<T, P>, "paginationKind">
  | OffsetParams<T, P>;

// ---------------------------------------------------------------------------
// SSR fallback shapes (D7)
// ---------------------------------------------------------------------------

/**
 * Shape of `fallbackData` when the params is cursor-mode.
 */
export interface CursorPageFallbackData<T extends { id: string }> {
  items: readonly T[];
  nextCursor: string | null;
  hasNextPage: boolean;
}

/**
 * Shape of `fallbackData` when the params is offset-mode.
 */
export interface OffsetPageFallbackData<T extends { id: string }> {
  items: readonly T[];
  page: number;
  total: number;
  hasMore: boolean;
}

// ---------------------------------------------------------------------------
// Result shape (D1 AC #2 — matches Story 3.2 line 183 verbatim)
// ---------------------------------------------------------------------------

/**
 * Public return type of `useCursorPaginated`. The field set and order
 * are locked by Story 3.2 line 183; D5 adds an optional
 * `retryBannerVisible` flag.
 *
 * `error` is `ApiError | null` (the typed RFC 7807 error class from
 * Phase 1, Epic 1.3). The hook never returns `unknown` for the
 * error — this is the cross-story contract rule on RFC 7807.
 */
export interface UseCursorPaginatedResult<T extends { id: string }> {
  items: readonly T[];
  isLoading: boolean;
  isLoadingMore: boolean;
  hasMore: boolean;
  loadMore: () => void;
  error: ApiError | null;
  refresh: () => Promise<void>;
  // D5 addition: 5xx triggers a banner (Story 3.2 line 229 — "surface a
  // generic error and call `refresh()`"). Optional; the field is
  // `false` when the consumer has not requested the banner or no 5xx
  // has occurred in the current session.
  retryBannerVisible?: boolean;
}
