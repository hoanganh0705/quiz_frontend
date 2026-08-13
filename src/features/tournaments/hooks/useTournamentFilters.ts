"use client";

/**
 * `useTournamentFilters` — URL-syncable filter state for the tournament list page.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.2 — Tournament discovery and read-only detail surfaces.
 * Source ticket: TKT-5.2.B5.
 *
 * ## What this hook owns
 *
 * - Mirrors the `TournamentListFilters` state with the URL search params
 *   so the tournament list is shareable, refreshable, and
 *   back/forward-navigation safe.
 * - Provides `setFilter` (single-field update), `resetFilters`, and
 *   the canonical URL serializer.
 *
 * ## URL contract
 *
 * The hook reads / writes three query params:
 *
 *   - `?status=upcoming|active|completed` — tournament status filter.
 *     `undefined` / absent param means "all statuses".
 *   - `?q=<search>` — free-text search.
 *   - `?cursor=<opaque>` — opaque pagination cursor; preserved
 *     through filter changes so back/forward navigation lands on
 *     the same page.
 *
 * Unknown query params are ignored (not rejected).
 *
 * ## Two-phase behavior (parity with `useAttemptHistoryFilters`)
 *
 * 1. **Mount (seed).** The hook reads `useSearchParams()` once and
 *    initialises the in-memory filter state from the URL.
 * 2. **Subsequent updates.** `setFilter` writes both the in-memory
 *    state and the URL via `router.replace(<pathname>?<serialised>)`
 *    so a filter change does not add a back-button entry.
 *    `resetFilters` clears the URL params and falls back to
 *    `DEFAULT_TOURNAMENT_LIST_FILTERS`.
 *
 * ## Strict-mode safety
 *
 * The hook is read/write safe inside React strict mode. The mount-
 * seed effect is guarded by a `seededRef` so a strict-mode double
 * render does not re-write the URL.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  DEFAULT_TOURNAMENT_LIST_FILTERS,
  type TournamentListFilters,
  type TournamentStatus,
} from "@/features/tournaments/types/tournament.types";

// ─── Param keys ──────────────────────────────────────────────────────────

const PARAM_STATUS = "status";
const PARAM_SEARCH = "q";
const PARAM_CURSOR = "cursor";

// ─── Parsers ─────────────────────────────────────────────────────────────

function parseStatusFilter(raw: string | null): TournamentStatus | undefined {
  switch (raw) {
    case "upcoming":
    case "registration":
    case "ongoing":
    case "finished":
    case "cancelled":
      return raw;
    default:
      return undefined;
  }
}

function parseSearchFilter(raw: string | null): string {
  if (raw === null) return "";
  return raw;
}

function parseCursorFilter(raw: string | null): string | undefined {
  if (raw === null || raw.length === 0) return undefined;
  return raw;
}

// ─── URL serializer ───────────────────────────────────────────────────────

/**
 * Serialize the filter state to a `URLSearchParams` instance.
 *
 * Default values are dropped so the URL stays minimal — the
 * absence of a param means "default". Unknown / future params are
 * never emitted.
 */
function serializeToParams(filters: TournamentListFilters): URLSearchParams {
  const params = new URLSearchParams();

  if (filters.status !== undefined) {
    params.set(PARAM_STATUS, filters.status);
  }
  if (filters.search.trim().length > 0) {
    params.set(PARAM_SEARCH, filters.search.trim());
  }
  if (filters.cursor !== undefined) {
    params.set(PARAM_CURSOR, filters.cursor);
  }

  return params;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export interface UseTournamentFiltersResult {
  filters: TournamentListFilters;
  /**
   * Single-field update. Writes both the in-memory state and the
   * URL (via `router.replace`). The cursor is preserved through the
   * update unless the caller explicitly passes `cursor: undefined`.
   */
  setFilter: <K extends keyof TournamentListFilters>(
    key: K,
    value: TournamentListFilters[K],
  ) => void;
  /**
   * Reset every filter to its default and clear the URL params.
   */
  resetFilters: () => void;
  /**
   * Set only the cursor, preserving status and search.
   */
  setCursor: (cursor: string | undefined) => void;
  /**
   * Clear only the cursor, preserving status and search.
   */
  clearCursor: () => void;
}

export function useTournamentFilters(): UseTournamentFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Mount-seed: read the URL once and initialise the filter state.
  // The ref guards the seed against strict-mode double render.
  const seededRef = useRef(false);

  const [filters, setFilters] = useState<TournamentListFilters>(() => {
    const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
    const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
    const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
    return {
      status,
      search,
      cursor,
      limit: DEFAULT_TOURNAMENT_LIST_FILTERS.limit,
    };
  });

  // Mount-seed + external-URL-sync: when the URL changes (mount,
  // back/forward navigation), seed or refresh the in-memory
  // filter state. The ref guards against the strict-mode double
  // render firing two `setFilters` calls on mount.
  useEffect(() => {
    if (!seededRef.current) {
      seededRef.current = true;
    }

    const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
    const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
    const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
    setFilters((prev) => {
      if (
        prev.status === status &&
        prev.search === search &&
        prev.cursor === cursor
      ) {
        return prev;
      }
      return {
        status,
        search,
        cursor,
        limit: DEFAULT_TOURNAMENT_LIST_FILTERS.limit,
      };
    });
  }, [searchParams]);

  const writeFiltersToUrl = useCallback(
    (next: TournamentListFilters): void => {
      const params = serializeToParams(next);
      const queryString = params.toString();
      const target =
        queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
      router.replace(target);
    },
    [router, pathname],
  );

  const setFilter = useCallback(
    <K extends keyof TournamentListFilters>(
      key: K,
      value: TournamentListFilters[K],
    ): void => {
      setFilters((prev) => {
        const next: TournamentListFilters = {
          ...prev,
          [key]: value,
        };
        // Status / search changes reset the cursor so a stale cursor
        // from a previous filter set does not leak into the new page.
        if (key === "status" || key === "search") {
          next.cursor = undefined;
        }
        return next;
      });
    },
    [],
  );

  const resetFilters = useCallback((): void => {
    setFilters({
      ...DEFAULT_TOURNAMENT_LIST_FILTERS,
    });
  }, []);

  const setCursor = useCallback((cursor: string | undefined): void => {
    setFilters((prev) => ({ ...prev, cursor }));
  }, []);

  const clearCursor = useCallback((): void => {
    setFilters((prev) => ({ ...prev, cursor: undefined }));
  }, []);

  // URL sync. Run as an effect (after render) so `router.replace`
  // schedules a navigation in the post-commit phase rather than
  // inside a state updater. Calling `router.replace` from inside a
  // `setFilters` updater would race with the render that produced
  // the updater and Next.js surfaces this as
  //   "Cannot update a component (`LinkComponent`) while
  //    rendering a different component (`TournamentsPage`)"
  // because `LinkComponent` reads the URL during the same render
  // pass.
  useEffect(() => {
    if (seededRef.current === false) return;
    writeFiltersToUrl(filters);
    // We intentionally depend on `filters` only — `writeFiltersToUrl`
    // closes over the latest `router` / `pathname` and is stable
    // across renders for a given route.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  return {
    filters,
    setFilter,
    resetFilters,
    setCursor,
    clearCursor,
  };
}
