"use client";

import { useMemo } from "react";

import {
ApiError,
projectWithId,
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

export interface UseMyAttemptsWithFiltersParams {

filters: AttemptHistoryFilters;
}

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

const items: AttemptHistoryRow[] = projectWithId((wire.data ?? []) as unknown as readonly Record<string, unknown>[], 'attemptId') as unknown as AttemptHistoryRow[];

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

export type { AttemptHistoryPage };