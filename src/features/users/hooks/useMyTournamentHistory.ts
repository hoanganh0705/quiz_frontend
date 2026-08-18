

import { useMemo } from "react";

import { ApiError, projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyTournamentHistory } from "@/features/users/services/users.profile.service";
import { myTournamentHistoryKey } from "@/features/users/types/tournament.types";
import type { MyTournamentHistoryItemDto } from "@/lib/api/generated/schemas";

export interface UseMyTournamentHistoryParams {
limit?: number;
}

type ListMyTournamentHistoryResponse = {
data?: MyTournamentHistoryItemDto[];
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export type TournamentHistoryItem = MyTournamentHistoryItemDto & { id: string };

export type UseMyTournamentHistoryResult =
UseCursorPaginatedResult<TournamentHistoryItem>;

export function useMyTournamentHistory(
params?: UseMyTournamentHistoryParams
): UseMyTournamentHistoryResult {
const fetcher = useMemo(
(): (
args: CursorFetcherArgs<UseMyTournamentHistoryParams>
    ) => Promise<CursorPage<TournamentHistoryItem>> =>
async ({ cursor }) => {
try {
const result = (await listMyTournamentHistory({
...(cursor ? { cursor } : {}),
...(params?.limit ? { limit: params.limit } : {}),
          })) as ListMyTournamentHistoryResponse;

const items = (result.data ?? []) as MyTournamentHistoryItemDto[];
const itemsWithId = projectWithId(items as unknown as readonly Record<string, unknown>[], 'tournamentId') as unknown as TournamentHistoryItem[];

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

return useCursorPaginated<TournamentHistoryItem, UseMyTournamentHistoryParams>({
key: myTournamentHistoryKey(),
fetcher,
params: params ?? {},
paginationKind: "cursor",
  });
}
