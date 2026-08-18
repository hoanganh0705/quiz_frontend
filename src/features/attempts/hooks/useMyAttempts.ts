

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyAttempts } from "@/features/attempts/services/attempts.service";
import { myAttemptsKey } from "@/features/users/types/user-analytics.types";
import type { AttemptSummaryResponseDto } from "@/lib/api/generated/schemas";

export interface UseMyAttemptsParams {
limit?: number;
}

type ListMyAttemptsResponse = {
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

export type AttemptSummary = AttemptSummaryResponseDto & { id: string };

export type UseMyAttemptsResult = UseCursorPaginatedResult<AttemptSummary>;

export function useMyAttempts(
params?: UseMyAttemptsParams
): UseMyAttemptsResult {
const fetcher = useMemo(
(): (args: CursorFetcherArgs<UseMyAttemptsParams>) => Promise<CursorPage<AttemptSummary>> =>
async ({ cursor }) => {
try {
const raw = await listMyAttempts({
...(cursor ? { cursor } : {}),
...(params?.limit ? { limit: params.limit } : {}),
          });
const result = raw as unknown as ListMyAttemptsResponse;

const items = (result.data ?? []) as AttemptSummaryResponseDto[];
const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'attemptId') as unknown as AttemptSummary[];

const pagination = result.meta?.pagination;
return {
items: itemsWithId,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? itemsWithId.length,
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
[params?.limit],
  );

return useCursorPaginated<AttemptSummary, UseMyAttemptsParams>({
key: myAttemptsKey(),
fetcher,
params: params ?? {},
paginationKind: "cursor",
  });
}
