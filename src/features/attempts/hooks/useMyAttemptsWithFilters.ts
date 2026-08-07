"use client";

/**
 * `useMyAttemptsWithFilters` — cursor-paginated "my attempts" hook
 * with URL-syncable filters.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.13.
 *
 * ## What this hook owns
 *
 * - Fetch the authenticated user's attempt history through the
 *   `listMyAttempts` service wrapper (T-4.15.1) using opaque cursor
 *   pagination and the verified filter union from T-4.15.3.
 * - Synthesise an `id` alias on each attempt summary so
 *   `appendUniqueById` deduplication in `useCursorPaginated` works.
 * - 404 normalises to an empty list (not an error state) so the
 *   history page can render the empty-state UI.
 * - 5xx / 401 / 403 / 429 propagate as typed `ApiError`; the
 *   `useCursorPaginated` primitive surfaces them via the
 *   `retryBannerVisible` flag.
 *
 * ## Status / date-range translation
 *
 * The deployed OpenAPI filter accepts `'completed'` / `'abandoned'`
 * / `'started'` as the canonical status values. The hook translates
 * the UI-friendly `'all'` sentinel to "no status filter" before
 * forwarding to the SDK.
 *
 * ## Auth-gating
 *
 * The hook is enabled only for an authenticated user. While auth is
 * unresolved or the viewer is unauthenticated the fetcher returns an
 * empty page so no request fires.
 *
 * ## Filter passthrough
 *
 * `status`, `dateRange`, `search`, `cursor`, and `limit` are passed
 * through verbatim. The hook NEVER decodes the cursor; the SDK
 * treats it as an opaque string.
 *
 * @see listMyAttempts (T-4.15.1) — wire call.
 * @see useAttemptHistoryFilters (T-4.15.14) — URL-syncable filters.
 */

import { useMemo } from "react";

import {
  ApiError,
  useCursorPaginated,
} from "@/lib/api";
import type {
  CursorFetcherArgs,
  CursorPage,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyAttempts } from "@/features/attempts/services/attempts.service";
import { useAuthSession } from "@/features/auth/hooks/use-auth-session";
import {
  ATTEMPT_HISTORY_CACHE_KEYS,
  type AttemptHistoryFilters,
  type AttemptHistoryPage,
  type AttemptHistoryRow,
} from "@/features/attempts/types/attempt-history.types";
import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

// ─── Public types ────────────────────────────────────────────────────────────

export interface UseMyAttemptsWithFiltersParams {
  /** Active filter state. The hook owns no internal filter state. */
  filters: AttemptHistoryFilters;
}

/**
 * Wire envelope returned by `listMyAttempts` (post-unwrap). The
 * pagination envelope mirrors the canonical `CursorPage<AttemptSummary>`
 * shape from the SDK.
 */
type ListMyAttemptsWireResponse = {
  data?: AttemptSummaryResponseDto[];
  meta?: {
    pagination?: {
      kind: "cursor";
      limit: number;
      nextCursor: string | null;
      hasNextPage: boolean;
    };
  };
};

/**
 * Public return type. Extends the cursor-paginated primitive with
 * the attempt-history item type.
 */
export type UseMyAttemptsWithFiltersResult =
  UseCursorPaginatedResult<AttemptHistoryRow>;

// ─── Status translation ──────────────────────────────────────────────────────

/**
 * Translate the UI-friendly `AttemptHistoryStatusFilter` value to
 * the canonical SDK filter value.
 *
 *   - `'all'`       → undefined (no status filter is forwarded).
 *   - `'completed'` → `'completed'`.
 *   - `'abandoned'` → `'abandoned'`.
 *   - `'started'`   → `'started'`.
 *
 * The hook never forwards an unsupported status — unknown UI
 * values are normalised to `undefined`.
 */
function toServiceStatusFilter(
  status: AttemptHistoryFilters["status"],
): "completed" | "abandoned" | "started" | undefined {
  switch (status) {
    case "completed":
      return "completed";
    case "abandoned":
      return "abandoned";
    case "started":
      return "started";
    case "all":
    default:
      return undefined;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useMyAttemptsWithFilters(
  params: UseMyAttemptsWithFiltersParams,
): UseMyAttemptsWithFiltersResult {
  const { filters } = params;

  const { bootstrapState, currentUser } = useAuthSession();

  const sessionId = useMemo<string | null>(() => {
    if (bootstrapState !== "authenticated") return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // Disabled state when the viewer is not authenticated. The
  // `useCursorPaginated` primitive still runs with the key, so
  // the result skeleton does not flash open before the auth
  // bootstrap resolves.
  const key = useMemo(
    () =>
      sessionId === null
        ? (["attempts", "history", "disabled"] as const)
        : ATTEMPT_HISTORY_CACHE_KEYS.list(sessionId, filters),
    [sessionId, filters],
  );

  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseMyAttemptsWithFiltersParams>): Promise<
        AttemptHistoryPage
      > => {
        // Disabled state: short-circuit to an empty page so no
        // service call is made while auth is unresolved.
        if (sessionId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? filters.cursor ?? undefined;
        const statusFilter = toServiceStatusFilter(filters.status);

        try {
          const wire = (await listMyAttempts({
            ...(statusFilter !== undefined ? { status: statusFilter } : {}),
            ...(filters.search.trim().length > 0
              ? { quizTitle: filters.search.trim() }
              : {}),
            ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
            ...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
          })) as unknown as ListMyAttemptsWireResponse;

          const items = (wire.data ?? []).map(
            (item): AttemptHistoryRow =>
              Object.assign({}, item, { id: item.attemptId }),
          );

          const pagination = wire.meta?.pagination;
          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? items.length,
          };
        } catch (err) {
          // 404 → empty page (the user has no attempts yet).
          if (err instanceof ApiError && err.status === 404) {
            return {
              items: [],
              nextCursor: null,
              hasNextPage: false,
              limit: 0,
            };
          }
          throw err;
        }
      },
    [sessionId, filters],
  );

  return useCursorPaginated<AttemptHistoryRow, UseMyAttemptsWithFiltersParams>(
    {
      key,
      fetcher,
      params,
      paginationKind: "cursor",
    },
  );
}

// Re-export for hook consumers that prefer the page-shaped type
// (`AttemptHistoryPage`).
export type { AttemptHistoryPage };