"use client";

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";

import { ATTEMPT_KEYS } from "@/features/attempts/query-keys";
import { listMyAttempts } from "@/features/attempts/services/attempts.service";
import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type {
  AttemptHistoryDateRange,
  AttemptHistoryFilters,
  AttemptHistoryPage,
  AttemptHistoryRow,
} from "@/features/attempts/types/attempt-history.types";
import type {
  CursorFetcherArgs,
  UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

export interface UseMyAttemptsWithFiltersParams {
  filters: AttemptHistoryFilters;
}

export type UseMyAttemptsWithFiltersResult =
  UseCursorPaginatedResult<AttemptHistoryRow>;

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

export function resolveDateRangeFromIso(
  dateRange: AttemptHistoryDateRange,
  now: Date = new Date(),
): string | undefined {
  const days =
    dateRange === "last_7_days"
      ? 7
      : dateRange === "last_30_days"
        ? 30
        : dateRange === "last_90_days"
          ? 90
          : null;

  if (days === null) return undefined;

  // Anchor to UTC start-of-day so the date window stays stable across refetches.
  const startUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate() - days,
  );
  return new Date(startUtc).toISOString();
}

export function useMyAttemptsWithFilters(
  params: UseMyAttemptsWithFiltersParams,
): UseMyAttemptsWithFiltersResult {
  const { filters } = params;

  const sessionId = useAuthSessionId();

  // Search is filtered client-side because `listMyAttempts` does not accept a
  // `quizTitle` wire parameter; excluding `search` from the server key avoids
  // redundant network calls on every keystroke.
  const serverFilters = useMemo<AttemptHistoryFilters>(
    () => ({
      status: filters.status,
      dateRange: filters.dateRange,
      search: "",
      cursor: filters.cursor,
      ...(typeof filters.limit === "number" ? { limit: filters.limit } : {}),
    }),
    [filters.status, filters.dateRange, filters.cursor, filters.limit],
  );

  const key = useMemo(
    () =>
      sessionId === null
        ? (["attempts", "history", "disabled"] as const)
        : ATTEMPT_KEYS.historyList(sessionId, serverFilters),
    [sessionId, serverFilters],
  );

  /* eslint-disable no-restricted-syntax -- Fetcher adapter translating SDK envelope to CursorPage shape for useCursorPaginated */
  const fetcher = useMemo(
    () =>
      async ({
        cursor,
      }: CursorFetcherArgs<UseMyAttemptsWithFiltersParams>): Promise<AttemptHistoryPage> => {
        if (sessionId === null) {
          return {
            items: [],
            nextCursor: null,
            hasNextPage: false,
            limit: 0,
          };
        }

        const effectiveCursor = cursor ?? serverFilters.cursor ?? undefined;
        const statusFilter = toServiceStatusFilter(serverFilters.status);
        const fromDate = resolveDateRangeFromIso(serverFilters.dateRange);

        try {
          const wire = await listMyAttempts({
            ...(statusFilter !== undefined ? { status: statusFilter } : {}),
            ...(fromDate !== undefined ? { fromDate } : {}),
            ...(effectiveCursor ? { cursor: effectiveCursor } : {}),
            ...(typeof serverFilters.limit === "number"
              ? { limit: serverFilters.limit }
              : {}),
          });

          const rawRows = wire.data ?? [];
          const items: AttemptHistoryRow[] = projectWithId(
            rawRows,
            "attemptId",
          );

          const pagination = wire.meta?.pagination;
          return {
            items,
            nextCursor: pagination?.nextCursor ?? null,
            hasNextPage: pagination?.hasNextPage ?? false,
            limit: pagination?.limit ?? items.length,
          };
        } catch (err) {
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
    [sessionId, serverFilters],
  );
  /* eslint-enable no-restricted-syntax */

  const result = useCursorPaginated<
    AttemptHistoryRow,
    UseMyAttemptsWithFiltersParams
  >({
    key,
    fetcher,
    params,
    paginationKind: "cursor",
  });

  const normalizedSearch = filters.search.trim().toLowerCase();

  const filteredItems = useMemo(() => {
    if (!normalizedSearch) return result.items;
    return result.items.filter((row) => {
      const title = row.quizTitle?.toLowerCase() ?? "";
      const slug = row.quizSlug?.toLowerCase() ?? "";
      const difficulty = row.difficulty?.toLowerCase() ?? "";
      return (
        title.includes(normalizedSearch) ||
        slug.includes(normalizedSearch) ||
        difficulty.includes(normalizedSearch)
      );
    });
  }, [result.items, normalizedSearch]);

  if (!normalizedSearch) {
    return result;
  }

  return {
    ...result,
    items: filteredItems,
  };
}

export type { AttemptHistoryPage };
