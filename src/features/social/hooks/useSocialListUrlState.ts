"use client";

/**
 * `useSocialListUrlState` — URL pagination contract helper for the four
 * Story 6.2 social-graph lists.
 *
 * Source epic:   Epic 6.2 — Read-only social-graph views.
 * Source story:  `projectDocs/Epics/PHASE_6_IMPLEMENTATION_PLAN.md` →
 *                Story 6.2 (lines 139–180).
 * Source ticket: TKT-6.2.B3.
 *
 * ## What this hook owns
 *
 * The URL state for every Story 6.2 list page that paginates with
 * cursors. Story 6.2 lists use cursor pagination
 * (`SOCIAL_GRAPH_PAGINATION_KIND === 'cursor'`) so the URL state is the
 * pair `{ cursor, limit }`. The hook abstracts `useRouter` /
 * `useSearchParams` / `usePathname` so the list components stay
 * declarative.
 *
 * `cursor` and `limit` are the only URL keys the surface writes; any
 * other key is left untouched. Forbidden key fragments
 * (`followId` / `friendshipId` / `offset`) are explicitly guarded
 * against so a future regression that tries to serialise internal
 * ids into the URL is rejected.
 *
 * ## Lifecycle invariants
 *
 *   - `targetUserId` changes → `offset` resets to `0` (profile-change
 *     reset; Story 6.2 Exit Criterion #6).
 *   - Caller invokes `reset()` (e.g. on logout) → `offset` and
 *     `limit` are removed from the URL.
 *   - `setLimit(n)` clamps to `SOCIAL_GRAPH_MAX_LIMIT` and rejects
 *     non-positive values.
 *   - `setCursor(c)` is a no-op when `c === currentCursor`.
 *
 * ## SSR-safety
 *
 * The hook reads from `useSearchParams()`. In the Next.js App Router
 * `useSearchParams` is client-only — the consumers of this hook are
 * client components (the list pages), so the constraint is met.
 *
 * @example
 *   const { cursor, limit, setCursor, setLimit, reset } =
 *     useSocialListUrlState(targetUserId);
 *   const page = useFollowers(cursor, limit);
 *   ...
 *   <button onClick={() => loadMore(page.nextCursor, (c) => setCursor(c))}>
 *     Load more
 *   </button>
 */

import { useCallback, useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  FORBIDDEN_SOCIAL_STORAGE_KEYS,
  SOCIAL_GRAPH_DEFAULT_LIMIT,
  SOCIAL_GRAPH_MAX_LIMIT,
  SOCIAL_GRAPH_URL_KEYS,
} from "@/features/social/pagination-invariants";

/**
 * The shape returned by `useSocialListUrlState`.
 */
export interface UseSocialListUrlStateResult {
  /** The current page's cursor. `null` indicates the first page. */
  cursor: string | null;
  /** The current `limit` clamped to `[1, SOCIAL_GRAPH_MAX_LIMIT]`. */
  limit: number;
  /** Set the cursor to the next page (or `null` for the first). */
  setCursor: (next: string | null) => void;
  /** Set the limit, clamped to `[1, SOCIAL_GRAPH_MAX_LIMIT]`. */
  setLimit: (next: number) => void;
  /** Reset to the first page with the default limit; removes URL keys. */
  reset: () => void;
}

const CURSOR_KEY = "cursor";
const LIMIT_KEY = "limit";

/**
 * Read a non-negative cursor from the URL (an empty string normalises
 * to `null`). Returns `null` if the key is absent or empty.
 */
function readCursorFromParams(params: URLSearchParams): string | null {
  const raw = params.get(CURSOR_KEY);
  if (raw === null || raw === "") return null;
  return raw;
}

/**
 * Read the limit from the URL with safe defaults.
 *
 *   - Missing / empty → `SOCIAL_GRAPH_DEFAULT_LIMIT`.
 *   - Negative or zero → `SOCIAL_GRAPH_DEFAULT_LIMIT`.
 *   - Greater than `SOCIAL_GRAPH_MAX_LIMIT` → `SOCIAL_GRAPH_MAX_LIMIT`.
 *   - Non-integer → rounded down to the nearest integer.
 */
function readLimitFromParams(params: URLSearchParams): number {
  const raw = params.get(LIMIT_KEY);
  if (raw === null || raw === "") return SOCIAL_GRAPH_DEFAULT_LIMIT;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return SOCIAL_GRAPH_DEFAULT_LIMIT;
  }
  if (parsed > SOCIAL_GRAPH_MAX_LIMIT) return SOCIAL_GRAPH_MAX_LIMIT;
  return parsed;
}

/**
 * Assert that no forbidden key is being written. Defensive guard —
 * internal ids like `followId` and `friendshipId` must never be
 * serialised to the URL.
 */
function assertNoForbiddenKeys(params: URLSearchParams): void {
  for (const key of FORBIDDEN_SOCIAL_STORAGE_KEYS) {
    if (params.has(key)) {
      throw new Error(
        `[useSocialListUrlState] forbidden URL key detected: "${key}". ` +
          `This indicates a regression that would leak unstable ` +
          `internal identifiers into the URL.`,
      );
    }
  }
}

/**
 * URL pagination contract for the Story 6.2 lists.
 *
 * @param targetUserId The target user id the list page is showing.
 *                    A change to this value triggers an automatic
 *                    `cursor` reset to `null` (Story 6.2 Exit
 *                    Criterion #6: "Pagination offsets reset on …
 *                    profile change").
 */
export function useSocialListUrlState(
  targetUserId: string | null,
): UseSocialListUrlStateResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const cursor = useMemo(
    () => readCursorFromParams(searchParams),
    [searchParams],
  );
  const limit = useMemo(
    () => readLimitFromParams(searchParams),
    [searchParams],
  );

  /**
   * Internal URL-mutation helper. Re-asserts the forbidden-key guard
   * so a regression cannot slip past the public setters.
   */
  const writeParams = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      mutate(params);
      assertNoForbiddenKeys(params);
      const query = params.toString();
      const next = query.length > 0 ? `${pathname}?${query}` : pathname;
      router.replace(next, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setCursor = useCallback(
    (next: string | null) => {
      writeParams((params) => {
        if (next === null || next === "") {
          params.delete(CURSOR_KEY);
        } else {
          params.set(CURSOR_KEY, next);
        }
      });
    },
    [writeParams],
  );

  const setLimit = useCallback(
    (next: number) => {
      // Reject non-finite / non-positive input outright (planning doc:
      // "rejects non-positive values"). This keeps the URL safe from
      // accidental `?limit=0` or `?limit=-5` values that the backend
      // would either reject or interpret as the server default.
      if (!Number.isFinite(next) || next <= 0) return;
      const clamped = Math.min(Math.floor(next), SOCIAL_GRAPH_MAX_LIMIT);
      writeParams((params) => {
        if (clamped === SOCIAL_GRAPH_DEFAULT_LIMIT) {
          params.delete(LIMIT_KEY);
        } else {
          params.set(LIMIT_KEY, String(clamped));
        }
      });
    },
    [writeParams],
  );

  const reset = useCallback(() => {
    writeParams((params) => {
      params.delete(CURSOR_KEY);
      params.delete(LIMIT_KEY);
    });
  }, [writeParams]);

  // Profile-change reset: when targetUserId changes, drop the
  // cursor / limit so the new profile starts at page 1. List
  // components mount with the fresh user id; this effect keeps the
  // URL aligned with the mounted state.
  useEffect(() => {
    if (!searchParams.has(CURSOR_KEY) && !searchParams.has(LIMIT_KEY)) return;
    reset();
    // We intentionally exclude `reset` and `searchParams` from the
    // dependency array: the effect should fire only when the user
    // id changes, not when the URL keys are mutated by setters.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetUserId]);

  return { cursor, limit, setCursor, setLimit, reset };
}

/**
 * Read-only access to the currently active URL keys. Exposed for
 * testing and for future list-page components that want to render
 * the cursor / limit as text next to the list.
 */
export const __testing = {
  CURSOR_KEY,
  LIMIT_KEY,
  SOCIAL_GRAPH_URL_KEYS,
  readCursorFromParams,
  readLimitFromParams,
  assertNoForbiddenKeys,
};
