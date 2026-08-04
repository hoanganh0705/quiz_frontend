"use client";

/**
 * `useAttemptHistoryFilters` — URL-syncable filter state for the
 * attempt-history page.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.14.
 *
 * ## What this hook owns
 *
 * - Mirrors the `AttemptHistoryFilters` state with the URL search
 *   params so the history list is shareable, refreshable, and
 *   back/forward-navigation safe.
 * - Provides `setFilter` (single-field update), `resetFilters`, and
 *   the canonical URL serializer.
 *
 * ## URL contract
 *
 * The hook reads / writes four query params:
 *
 *   - `?status=completed|abandoned|started|all` — UI-friendly sentinel
 *     `all` is the absence-of-filter marker; it is dropped from the
 *     URL when the value is the default.
 *   - `?date=last_7_days|last_30_days|last_90_days|all` — preset
 *     date-range filter.
 *   - `?q=<search>` — free-text quiz search.
 *   - `?cursor=<opaque>` — opaque pagination cursor; preserved
 *     through filter changes so back/forward navigation lands on
 *     the same page.
 *
 * Unknown query params are ignored (not rejected).
 *
 * ## Two-phase behavior (parity with `useQuizFiltersUrlSync`)
 *
 * 1. **Mount (seed).** The hook reads `useSearchParams()` once and
 *    initialises the in-memory filter state from the URL.
 * 2. **Subsequent updates.** `setFilter` writes both the in-memory
 *    state and the URL via `router.replace(<pathname>?<serialised>)`
 *    so a history-page filter change does not add a back-button
 *    entry. `resetFilters` clears the URL params and falls back to
 *    `DEFAULT_ATTEMPT_HISTORY_FILTERS`.
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
  DEFAULT_ATTEMPT_HISTORY_FILTERS,
  type AttemptHistoryDateRange,
  type AttemptHistoryFilters,
  type AttemptHistoryStatusFilter,
} from "@/features/attempts/types/attempt-history.types";

// ─── Param keys ──────────────────────────────────────────────────────────────

const PARAM_STATUS = "status";
const PARAM_DATE = "date";
const PARAM_SEARCH = "q";
const PARAM_CURSOR = "cursor";

// ─── Parsers ─────────────────────────────────────────────────────────────────

function parseStatusFilter(raw: string | null): AttemptHistoryStatusFilter {
  switch (raw) {
    case "completed":
    case "abandoned":
    case "started":
    case "all":
      return raw;
    default:
      return DEFAULT_ATTEMPT_HISTORY_FILTERS.status;
  }
}

function parseDateFilter(raw: string | null): AttemptHistoryDateRange {
  switch (raw) {
    case "last_7_days":
    case "last_30_days":
    case "last_90_days":
    case "all":
      return raw;
    default:
      return DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange;
  }
}

function parseSearchFilter(raw: string | null): string {
  if (raw === null) return "";
  return raw;
}

function parseCursorFilter(raw: string | null): string | null {
  if (raw === null || raw.length === 0) return null;
  return raw;
}

// ─── URL serializer ──────────────────────────────────────────────────────────

/**
 * Serialize the filter state to a `URLSearchParams` instance.
 *
 * Default values are dropped so the URL stays minimal — the
 * absence of a param means "default". Unknown / future params are
 * never emitted.
 */
export function serializeAttemptHistoryFiltersToParams(
  filters: AttemptHistoryFilters,
): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.status !== DEFAULT_ATTEMPT_HISTORY_FILTERS.status) {
    params.set(PARAM_STATUS, filters.status);
  }
  if (filters.dateRange !== DEFAULT_ATTEMPT_HISTORY_FILTERS.dateRange) {
    params.set(PARAM_DATE, filters.dateRange);
  }
  if (filters.search.trim().length > 0) {
    params.set(PARAM_SEARCH, filters.search.trim());
  }
  if (filters.cursor !== null) {
    params.set(PARAM_CURSOR, filters.cursor);
  }
  return params;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface UseAttemptHistoryFiltersResult {
  filters: AttemptHistoryFilters;
  /**
   * Single-field update. Writes both the in-memory state and the
   * URL (via `router.replace`). The cursor is preserved through the
   * update unless the caller explicitly passes `cursor: null`.
   */
  setFilter: <K extends keyof AttemptHistoryFilters>(
    key: K,
    value: AttemptHistoryFilters[K],
  ) => void;
  /**
   * Reset every filter to its default and clear the URL params
   * (cursor is preserved).
   */
  resetFilters: () => void;
}

export function useAttemptHistoryFilters(): UseAttemptHistoryFiltersResult {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Mount-seed: read the URL once and initialise the filter state.
  // The ref guards the seed against strict-mode double render.
  const seededRef = useRef(false);
  const [filters, setFilters] = useState<AttemptHistoryFilters>(() => {
    const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
    const dateRange = parseDateFilter(searchParams.get(PARAM_DATE));
    const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
    const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
    return {
      status,
      dateRange,
      search,
      cursor,
      limit: DEFAULT_ATTEMPT_HISTORY_FILTERS.limit,
    };
  });

  useEffect(() => {
    if (seededRef.current) return;
    seededRef.current = true;
    // The seed runs once; the initial render above already reads
    // the URL. This effect exists so a route change (history
    // navigation) can re-seed the state when the user uses the
    // back / forward buttons.
    const status = parseStatusFilter(searchParams.get(PARAM_STATUS));
    const dateRange = parseDateFilter(searchParams.get(PARAM_DATE));
    const search = parseSearchFilter(searchParams.get(PARAM_SEARCH));
    const cursor = parseCursorFilter(searchParams.get(PARAM_CURSOR));
    setFilters({
      status,
      dateRange,
      search,
      cursor,
      limit: DEFAULT_ATTEMPT_HISTORY_FILTERS.limit,
    });
  }, [searchParams]);

  const writeFiltersToUrl = useCallback(
    (next: AttemptHistoryFilters): void => {
      const params = serializeAttemptHistoryFiltersToParams(next);
      const queryString = params.toString();
      const target =
        queryString.length > 0 ? `${pathname}?${queryString}` : pathname;
      router.replace(target);
    },
    [router, pathname],
  );

  const setFilter = useCallback(
    <K extends keyof AttemptHistoryFilters>(
      key: K,
      value: AttemptHistoryFilters[K],
    ): void => {
      setFilters((prev) => {
        const next: AttemptHistoryFilters = {
          ...prev,
          [key]: value,
        };
        // Status / dateRange / search changes reset the cursor so a
        // stale cursor from a previous filter set does not leak into
        // the new page.
        if (key === "status" || key === "dateRange" || key === "search") {
          next.cursor = null;
        }
        writeFiltersToUrl(next);
        return next;
      });
    },
    [writeFiltersToUrl],
  );

  const resetFilters = useCallback((): void => {
    const next: AttemptHistoryFilters = {
      ...DEFAULT_ATTEMPT_HISTORY_FILTERS,
      // Preserve the limit so a route change to /history does not
      // reset the per-page size.
      limit: filters.limit,
    };
    setFilters(next);
    writeFiltersToUrl(next);
  }, [filters.limit, writeFiltersToUrl]);

  return {
    filters,
    setFilter,
    resetFilters,
  };
}