'use client';

/**
 * `useOffsetPaginated.ts`
 *
 * Source epic:   Epic 7.11 — Admin Audit Log Surface and Backend Capability Verification.
 * Source ticket: TKT-7.11.C4.
 *
 * ## Purpose
 *
 * A reusable offset-based pagination hook for the audit log surface
 * and any other admin surface that uses offset pagination.
 *
 * This is a lighter-weight alternative to the Phase-6 `useOffsetPaginated`
 * in `@/lib/api/use-offset-paginated.ts`, which wraps cursor pagination
 * internally. The audit log uses true offset pagination server-side,
 * so this hook exposes a direct offset-numbered API.
 *
 * ## Why a separate hook
 *
 * The Phase-6 `useOffsetPaginated` wraps `useCursorPaginated` and
 * exposes an offset-shaped surface. For the audit log use case, we
 * need a hook that:
 *
 *   - Manages `offset` and `limit` state directly (no cursor wrapping)
 *   - Provides page navigation helpers (`goToPage`, `nextPage`, `prevPage`)
 *   - Provides derived values (`page`, `totalPages`, `hasNextPage`, `hasPrevPage`)
 *   - Provides a `resetPagination` function for filter changes
 *
 * ## SSR-safety
 *
 * The hook uses React state — it is client-only. The page component
 * should be wrapped in a "use client" boundary.
 */

import { useCallback, useMemo, useState } from 'react';

// ─── Constants ──────────────────────────────────────────────────────────────

export const AUDIT_LOG_DEFAULT_PAGE_SIZE = 20;
export const AUDIT_LOG_MAX_PAGE_SIZE = 100;

// ─── Public types ─────────────────────────────────────────────────────────

export interface UseOffsetPaginatedParams {
  /** Initial offset (default: 0) */
  readonly initialOffset?: number;
  /** Initial limit (default: 20) */
  readonly initialLimit?: number;
  /** Total count of items (from API response) */
  readonly total: number;
  /** Maximum allowed page size */
  readonly maxLimit?: number;
}

export interface UseOffsetPaginatedResult {
  /** Current offset (0-indexed) */
  readonly offset: number;
  /** Current limit (per page) */
  readonly limit: number;
  /** Current page (1-indexed) */
  readonly page: number;
  /** Total number of pages */
  readonly totalPages: number;
  /** True if there is a next page */
  readonly hasNextPage: boolean;
  /** True if there is a previous page */
  readonly hasPrevPage: boolean;
  /** Navigate to a specific page (1-indexed) */
  readonly goToPage: (page: number) => void;
  /** Navigate to the next page */
  readonly nextPage: () => void;
  /** Navigate to the previous page */
  readonly prevPage: () => void;
  /** Reset pagination to offset 0 (for filter changes) */
  readonly resetPagination: () => void;
  /** Set a new offset directly */
  readonly setOffset: (offset: number) => void;
  /** Set a new limit (resets to first page) */
  readonly setLimit: (limit: number) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Clamp `limit` against `[1, maxLimit]` and fall back to default
 * if invalid.
 */
function clampLimit(input: number, maxLimit: number): number {
  if (typeof input !== 'number' || !Number.isFinite(input)) {
    return AUDIT_LOG_DEFAULT_PAGE_SIZE;
  }
  if (input <= 0) return AUDIT_LOG_DEFAULT_PAGE_SIZE;
  if (input > maxLimit) return maxLimit;
  return Math.floor(input);
}

// ─── Hook ─────────────────────────────────────────────────────────────────

/**
 * Offset-based pagination hook with navigation helpers.
 *
 * @example
 *   const { page, totalPages, hasNextPage, nextPage } =
 *     useOffsetPaginated({ total: 150, initialLimit: 20 });
 */
export function useOffsetPaginated(
  params: UseOffsetPaginatedParams,
): UseOffsetPaginatedResult {
  const {
    initialOffset = 0,
    initialLimit = AUDIT_LOG_DEFAULT_PAGE_SIZE,
    total,
    maxLimit = AUDIT_LOG_MAX_PAGE_SIZE,
  } = params;

  const [offset, setOffsetState] = useState(() =>
    Math.max(0, initialOffset),
  );
  const [limit, setLimitState] = useState(() =>
    clampLimit(initialLimit, maxLimit),
  );

  // ─── Derived values ────────────────────────────────────────────────────

  const page = useMemo(() => Math.floor(offset / limit) + 1, [offset, limit]);
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / limit)),
    [total, limit],
  );
  const hasNextPage = useMemo(
    () => offset + limit < total,
    [offset, limit, total],
  );
  const hasPrevPage = useMemo(() => offset > 0, [offset]);

  // ─── Navigation functions ──────────────────────────────────────────────

  const goToPage = useCallback(
    (targetPage: number) => {
      if (typeof targetPage !== 'number' || !Number.isFinite(targetPage)) {
        return;
      }
      const clampedPage = Math.max(1, Math.min(targetPage, totalPages));
      const newOffset = (clampedPage - 1) * limit;
      setOffsetState(newOffset);
    },
    [limit, totalPages],
  );

  const nextPage = useCallback(() => {
    if (hasNextPage) {
      setOffsetState((prev) => prev + limit);
    }
  }, [hasNextPage, limit]);

  const prevPage = useCallback(() => {
    if (hasPrevPage) {
      setOffsetState((prev) => Math.max(0, prev - limit));
    }
  }, [hasPrevPage, limit]);

  const resetPagination = useCallback(() => {
    setOffsetState(0);
  }, []);

  const setOffset = useCallback(
    (newOffset: number) => {
      if (typeof newOffset !== 'number' || newOffset < 0) return;
      const maxOffset = Math.max(0, Math.floor(total / limit) * limit);
      setOffsetState(Math.min(newOffset, maxOffset));
    },
    [total, limit],
  );

  const setLimit = useCallback(
    (newLimit: number) => {
      const clamped = clampLimit(newLimit, maxLimit);
      setLimitState(clamped);
      // Reset to first page when changing limit
      setOffsetState(0);
    },
    [maxLimit],
  );

  return {
    offset,
    limit,
    page,
    totalPages,
    hasNextPage,
    hasPrevPage,
    goToPage,
    nextPage,
    prevPage,
    resetPagination,
    setOffset,
    setLimit,
  };
}