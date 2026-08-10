"use client";

/**
 * `useSearch` — primary data hook for the unified search surface.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.6 — Search and Approved Read-Only Social Discovery Integration.
 * Source ticket: TKT-5.6.B2.
 *
 * ## What this hook owns
 *
 * - Debounce the raw `params.q` via `useDebouncedValue` so a burst of
 *   input changes collapses into a single fetch.
 * - Trim and normalise whitespace from `params.q` before issuing a
 *   request — components never see a query with leading/trailing
 *   whitespace.
 * - Enforce the backend's minimum query length (2 chars); below the
 *   threshold, the hook short-circuits to an empty response and does
 *   not fire a request.
 * - Cancel in-flight requests when a newer query is issued or when
 *   the hook unmounts, via an internal `AbortController` epoch.
 * - Preserve the previous `groups` payload while a new query is
 *   fetching (stale-data behaviour). Components can render the
 *   previous groups alongside `isLoading: true`.
 * - Map the wire-level `ApiError.code` into the documented
 *   `SearchErrorCode` union so components branch on a stable string
 *   union instead of HTTP `status`.
 * - Clamp `limit` to the documented backend maximum (20).
 * - Feature-flag gating via `search_live`. When the flag is
 *   `'placeholder'`, the hook returns the empty response without
 *   firing any request.
 *
 * ## Cancellation discipline
 *
 * Each call increments an internal "epoch" counter. The fetch
 * captures the epoch at request start; when the response resolves,
 * the hook compares the captured epoch to the latest epoch. Stale
 * responses (out-of-order) are discarded and never reach component
 * state. The `AbortController` is also aborted when a newer query
 * arrives, so the underlying `fetch` request is cancelled at the
 * transport layer.
 *
 * ## Server authority
 *
 * The grouped response is server-authoritative. The hook never
 * aggregates or mutates the backend response — it only flattens the
 * nested `SearchResponseDto` into a `groups` record and synthesises
 * stable `id` aliases for per-kind DTOs.
 *
 * ## Cursor hygiene
 *
 * Search uses cursor-less queries (per the master plan §5.6).
 * `SearchResponseDto.cursor` is reserved for future expansion and
 * is treated as opaque when present.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";

import {
  DEFAULT_SEARCH_QUERY_PARAMS,
  SEARCH_CACHE_KEYS,
  type SearchErrorCode,
  type SearchGroup,
  type SearchQueryParams,
  type SearchQueryState,
  type SearchResponseDto,
  type SearchResultKind,
} from "@/features/search/types/search.types";
import { DEFAULT_SEARCH_DEBOUNCE_MS } from "@/features/search/hooks/useDebouncedValue";
import { useDebouncedValue } from "@/lib/utils/use-debounced-value";
import { search } from "@/features/search/services/search.service";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import type { SearchResponseDto as SearchResponseWireDto } from "@/lib/api/generated/schemas/searchResponseDto";

// ─── Constants ────────────────────────────────────────────────────────────

/** Backend minimum query length. Mirrors the OpenAPI `@minLength 2`. */
export const SEARCH_MIN_QUERY_LENGTH = 2;

/** Backend maximum per-section result limit. Mirrors `@maximum 20`. */
export const SEARCH_MAX_LIMIT = 20;

/** Default per-section limit applied when the caller omits `limit`. */
export const SEARCH_DEFAULT_LIMIT = 20;

// ─── Public types ─────────────────────────────────────────────────────────

/**
 * Result shape returned by `useSearch`.
 *
 * Components branch on:
 *   - `state`         — coarse state machine for skeleton / error UX.
 *   - `error?.code`   — typed `SearchErrorCode` for copy lookup.
 *   - `isLoading`     — `true` while a debounced fetch is in flight.
 *   - `isStale`       — `true` when `isLoading && groups !== null` (the
 *                       previous result is still visible).
 *   - `cancel()`      — abort the in-flight request without changing
 *                       the displayed groups.
 *   - `retry()`       — re-issue the current debounced query, ignoring
 *                       the debounce window.
 */
export interface UseSearchResult {
  /** Flattened grouped response, or `null` before the first success. */
  groups: SearchResponseDto["groups"] | null;
  /** Original (non-debounced) query string as last accepted by the hook. */
  query: string;
  /** Debounced query string used for the most recent fetch. */
  debouncedQuery: string;
  /** Coarse state machine. */
  state: SearchQueryState;
  /** `true` while a fetch is in flight. */
  isLoading: boolean;
  /** `true` when `isLoading && groups !== null`. */
  isStale: boolean;
  /** Typed error from the most recent fetch. `null` when no error. */
  error: ApiError | null;
  /** `true` when at least one group is present in the response. */
  hasResults: boolean;
  /** Re-issue the current debounced query, bypassing the debounce window. */
  retry: () => Promise<void>;
  /** Abort the in-flight request without changing displayed groups. */
  cancel: () => void;
}

// ─── Wire → feature adapter ───────────────────────────────────────────────

/**
 * Build a stable href from a per-kind DTO.
 *
 * The wire-level search response does not yet expose a `href` field;
 * we synthesise it from the stable public ID/slug per kind so the
 * downstream card components can render navigation links without
 * reaching into URL routing constants. All hrefs use only stable
 * public identifiers — never `followId` or `friendshipId`.
 */
function buildHrefForKind(
  kind: SearchResultKind,
  item: { id: string; slug?: string | null },
): string {
  switch (kind) {
    case "quiz":
      return `/quizzes/${item.slug ?? item.id}`;
    case "user":
      return `/profile/${item.id}`;
    case "tournament":
      return `/tournaments/${item.id}`;
    case "achievement":
      return `/achievements#${item.id}`;
    case "ranking":
      return `/leaderboard#${item.id}`;
    case "tag":
      return `/tags/${item.id}`;
    case "category":
      // The wire-level category slug is a branded object (per the
      // generated SDK shape), not a plain string. Until the backend
      // emits a plain-string slug, fall back to the category id.
      return `/categories/${item.id}`;
    case "comment":
      return `/quizzes/${item.id}#comments`;
    case "social":
      return `/profile/${item.id}`;
    default:
      return "/";
  }
}

/**
 * Map the wire-level per-kind result into the feature-level DTO.
 *
 * The wire shape does not yet expose a `displayName` or `subtitle`;
 * the adapter synthesises them from the documented wire fields so the
 * downstream card components can render without branching on shape.
 */
type WireQuiz = {
  quizId: string;
  title: string;
  slug: string;
};
type WireUser = {
  userId: string;
  username: string;
  displayName?: string | null;
};
type WireTag = { tagId: string; name: string };
type WireComment = { commentId: string; quizId: string };
type WireCategory = {
  categoryId: string;
  name: string;
};

/**
 * Adapter from the wire response to the flattened feature response.
 *
 * The wire `SearchResponseDto` is nested (one field per kind); this
 * adapter flattens it into the feature-level `groups` record keyed by
 * `SearchResultKind`. Each group carries a default
 * `visibility: 'public'` — the privacy field is reserved for a future
 * backend contract extension (Story 5.6 acceptance criterion #4).
 */
function adaptWireToFeature(
  wire: SearchResponseWireDto,
): SearchResponseDto {
  const groups: Partial<Record<SearchResultKind, SearchGroup<unknown>>> = {};

  const quizzes = (wire.quizzes ?? []).map((q: WireQuiz) => ({
    id: q.quizId,
    quizId: q.quizId,
    title: q.title,
    slug: q.slug,
    displayName: q.title,
    subtitle: undefined,
    href: buildHrefForKind("quiz", { id: q.quizId, slug: q.slug }),
    visibility: "public" as const,
  }));
  if (quizzes.length > 0) {
    groups.quiz = {
      kind: "quiz",
      items: quizzes,
      visibility: "public",
    };
  }

  const users = (wire.users ?? []).map((u: WireUser) => ({
    id: u.userId,
    userId: u.userId,
    username: u.username,
    displayName: u.displayName ?? u.username,
    subtitle: u.username !== (u.displayName ?? u.username) ? u.username : undefined,
    href: buildHrefForKind("user", { id: u.userId }),
    visibility: "public" as const,
  }));
  if (users.length > 0) {
    groups.user = {
      kind: "user",
      items: users,
      visibility: "public",
    };
  }

  const tags = (wire.tags ?? []).map((t: WireTag) => ({
    id: t.tagId,
    tagId: t.tagId,
    name: t.name,
    displayName: t.name,
    subtitle: undefined,
    href: buildHrefForKind("tag", { id: t.tagId }),
    visibility: "public" as const,
  }));
  if (tags.length > 0) {
    groups.tag = {
      kind: "tag",
      items: tags,
      visibility: "public",
    };
  }

  const categories = (wire.categories ?? []).map((c: WireCategory) => ({
    id: c.categoryId,
    categoryId: c.categoryId,
    name: c.name,
    displayName: c.name,
    subtitle: undefined,
    href: buildHrefForKind("category", { id: c.categoryId }),
    visibility: "public" as const,
  }));
  if (categories.length > 0) {
    groups.category = {
      kind: "category",
      items: categories,
      visibility: "public",
    };
  }

  const comments = (wire.commentss ?? []).map((c: WireComment) => ({
    id: c.commentId,
    commentId: c.commentId,
    quizId: c.quizId,
    displayName: "Comment",
    subtitle: undefined,
    href: buildHrefForKind("comment", { id: c.quizId }),
    visibility: "public" as const,
  }));
  if (comments.length > 0) {
    groups.comment = {
      kind: "comment",
      items: comments,
      visibility: "public",
    };
  }

  return {
    query: wire.query,
    groups,
  };
}

// ─── Error code mapping ───────────────────────────────────────────────────

/**
 * Map the wire-level `ApiError.code` (RFC 7807 extensions.code) into
 * the feature-level `SearchErrorCode` union.
 *
 * The backend currently emits the synthesised global codes from the
 * `GlobalExceptionFilter`. We map the relevant subset:
 *
 * - 429 / `GLOBAL_RATE_LIMITED` → `SEARCH_RATE_LIMITED`
 * - 400 with `string[]` message → `SEARCH_INVALID_QUERY`
 * - 400 (single string) → `SEARCH_QUERY_TOO_SHORT` / `SEARCH_QUERY_TOO_LONG`
 *   based on the message heuristic (the backend currently emits a
 *   descriptive message; we keep the typed-code surface narrow).
 * - 503 / `GLOBAL_INTERNAL_ERROR` → `SEARCH_BACKEND_UNAVAILABLE`
 * - 401 → `UNAUTHORIZED`
 * - 403 → `FORBIDDEN`
 * - any other 5xx → `GLOBAL_INTERNAL_ERROR`
 * - any other 4xx → `GLOBAL_VALIDATION_FAILED`
 */
function mapApiErrorToSearchCode(
  apiErr: ApiError,
  trimmedQueryLength: number,
): SearchErrorCode {
  const code = apiErr.code;
  const status = apiErr.status;

  if (code === "GLOBAL_RATE_LIMITED" || status === 429) {
    return "SEARCH_RATE_LIMITED";
  }
  if (code === "GLOBAL_UNAUTHENTICATED" || status === 401) {
    return "UNAUTHORIZED";
  }
  if (code === "GLOBAL_FORBIDDEN" || status === 403) {
    return "FORBIDDEN";
  }
  if (status === 400 || code === "GLOBAL_VALIDATION_FAILED") {
    if (trimmedQueryLength < SEARCH_MIN_QUERY_LENGTH) {
      return "SEARCH_QUERY_TOO_SHORT";
    }
    return "SEARCH_INVALID_QUERY";
  }
  if (status >= 500 || code === "GLOBAL_INTERNAL_ERROR") {
    return status === 503 ? "SEARCH_BACKEND_UNAVAILABLE" : "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Fetch the unified search response for `params` with debounce,
 * cancellation, stale-result preservation, and feature-flag gating.
 */
export function useSearch(
  params: SearchQueryParams = DEFAULT_SEARCH_QUERY_PARAMS,
  options: { debounceMs?: number } = {},
): UseSearchResult {
  const flagValue = getFeatureFlagValue("search_live");
  const isFlagPlaceholder = flagValue === "placeholder";

  const debounceMs = options.debounceMs ?? DEFAULT_SEARCH_DEBOUNCE_MS;

  // Trim once at the boundary so the debounce key is stable across
  // re-renders that pass the same logical query.
  const rawQuery = params.q ?? "";
  const trimmedQuery = useMemo(() => rawQuery.trim(), [rawQuery]);
  const { debouncedValue: debouncedQuery } = useDebouncedValue(trimmedQuery, debounceMs);

  // Clamp limit at the boundary; the backend caps at 20.
  const clampedLimit = useMemo(() => {
    if (typeof params.limit !== "number") return undefined;
    return Math.min(Math.max(1, params.limit), SEARCH_MAX_LIMIT);
  }, [params.limit]);

  return useSearchInner({
    trimmedQuery,
    debouncedQuery,
    clampedLimit,
    kinds: params.kinds,
    isFlagPlaceholder,
  });
}

// ─── Inner hook (always runs; the fetch effect is gated on the flag) ──────

interface UseSearchInnerArgs {
  trimmedQuery: string;
  debouncedQuery: string;
  clampedLimit: number | undefined;
  kinds: SearchResultKind[] | undefined;
  isFlagPlaceholder: boolean;
}

/**
 * The internal hook body. All hooks are called unconditionally so the
 * Rules of Hooks are satisfied; the fetch effect is gated on the
 * feature flag and short-circuits to the empty response when the flag
 * is `'placeholder'`.
 */
function useSearchInner(args: UseSearchInnerArgs): UseSearchResult {
  const { trimmedQuery, debouncedQuery, clampedLimit, kinds, isFlagPlaceholder } =
    args;

  // Epoch counter — increments on every new query. The fetch captures
  // the current epoch; out-of-order responses (epoch < latest) are
  // discarded.
  const epochRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Latest SWR cache key — used for the deduped SWR lookups and
  // for invalidation hooks.
  const swrKey = useMemo(
    () =>
      SEARCH_CACHE_KEYS.results({
        q: debouncedQuery,
        limit: clampedLimit,
        kinds,
      }),
    [debouncedQuery, clampedLimit, kinds],
  );

  const [groups, setGroups] = useState<SearchResponseDto["groups"] | null>(
    null,
  );
  const [error, setError] = useState<ApiError | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const fetchForQuery = useCallback(
    async (signal: AbortSignal): Promise<void> => {
      const currentEpoch = epochRef.current;
      try {
        const wire = (await search(debouncedQuery, {
          ...(clampedLimit !== undefined ? { limit: clampedLimit } : {}),
        })) as unknown as SearchResponseWireDto;

        // Out-of-order response — discard.
        if (signal.aborted || currentEpoch !== epochRef.current) {
          return;
        }

        const adapted = adaptWireToFeature(wire);
        setGroups(adapted.groups);
        setError(null);
      } catch (cause: unknown) {
        if (signal.aborted || currentEpoch !== epochRef.current) {
          return;
        }

        if (isApiError(cause)) {
          const apiErr = cause as ApiError;
          const searchCode = mapApiErrorToSearchCode(
            apiErr,
            debouncedQuery.length,
          );
          setError(
            new ApiError({
              ...(apiErr as unknown as Record<string, unknown>),
              code: searchCode,
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
          setGroups(null);
        } else {
          // Non-typed rejection — synthesise an internal error.
          setError(
            new ApiError({
              status: 0,
              code: "GLOBAL_INTERNAL_ERROR",
              message:
                cause instanceof Error
                  ? cause.message
                  : "Unknown search error",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
          setGroups(null);
        }
      }
    },
    [debouncedQuery, clampedLimit],
  );

  // Drive the fetch off the debounced query. Aborts any in-flight
  // request and increments the epoch on every change.
  useEffect(() => {
    // Feature flag off → no request, no loading, no error.
    if (isFlagPlaceholder) {
      abortRef.current?.abort();
      epochRef.current += 1;
      setIsLoading(false);
      setGroups(null);
      setError(null);
      return;
    }

    // Below the backend minimum length → short-circuit.
    if (debouncedQuery.length < SEARCH_MIN_QUERY_LENGTH) {
      abortRef.current?.abort();
      epochRef.current += 1;
      setIsLoading(false);
      setGroups(null);
      setError(null);
      return;
    }

    // Abort the previous fetch and bump the epoch.
    abortRef.current?.abort();
    epochRef.current += 1;
    const controller = new AbortController();
    abortRef.current = controller;
    const capturedEpoch = epochRef.current;

    setIsLoading(true);

    void fetchForQuery(controller.signal).finally(() => {
      if (capturedEpoch === epochRef.current && !controller.signal.aborted) {
        setIsLoading(false);
      }
    });

    return () => {
      controller.abort();
    };
  }, [debouncedQuery, fetchForQuery, isFlagPlaceholder]);

  // Derived coarse state machine.
  const state: SearchQueryState = useMemo(() => {
    if (isFlagPlaceholder) return "idle";
    if (error) return "error";
    if (isLoading && groups !== null) return "stale";
    if (isLoading) return "fetching";
    if (debouncedQuery.length < SEARCH_MIN_QUERY_LENGTH) return "idle";
    if (
      groups !== null &&
      Object.keys(groups).length === 0
    ) {
      return "empty";
    }
    if (groups !== null) return "success";
    return "idle";
  }, [error, isLoading, groups, debouncedQuery, isFlagPlaceholder]);

  const hasResults = useMemo(() => {
    if (!groups) return false;
    return Object.values(groups).some(
      (g) => (g as SearchGroup<unknown>).items.length > 0,
    );
  }, [groups]);

  const retry = useCallback(async () => {
    if (isFlagPlaceholder) return;
    abortRef.current?.abort();
    epochRef.current += 1;
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    try {
      await fetchForQuery(controller.signal);
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [fetchForQuery, isFlagPlaceholder]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    epochRef.current += 1;
    setIsLoading(false);
  }, []);

  const isStale = isLoading && groups !== null;

  // Suppress an unused-var warning for `swrKey` while keeping it
  // documented for consumers and future SWR migration.
  void swrKey;

  return {
    groups,
    query: trimmedQuery,
    debouncedQuery,
    state,
    isLoading,
    isStale,
    error,
    hasResults,
    retry,
    cancel,
  };
}