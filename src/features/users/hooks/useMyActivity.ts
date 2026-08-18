

import { useMemo } from "react";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";

import { listMyActivity } from "@/features/users/services/users.profile.service";
import { myActivityKey } from "@/features/users/types/activity.types";
import type { UserActivityItemDto } from "@/features/users/types";

export interface UseMyActivityParams {
limit?: number;
}

type ListMyActivityResponse = {
data?: UserActivityItemDto[];
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export type UseMyActivityResult = UseCursorPaginatedResult<UserActivityItemDto>;

export function useMyActivity(params?: UseMyActivityParams): UseMyActivityResult {
const fetcher = useMemo(
(): (args: CursorFetcherArgs<UseMyActivityParams>) => Promise<CursorPage<UserActivityItemDto>> =>
async ({ cursor, signal }) => {
try {
const result = (await listMyActivity({
...(cursor ? { cursor } : {}),
...(params?.limit ? { limit: params.limit } : {}),
          })) as ListMyActivityResponse;

const items = (result.data ?? []) as UserActivityItemDto[];
const itemsWithId: UserActivityItemDto[] = items.map((item) =>
Object.assign({}, item, { id: item.id }),
          );

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

return useCursorPaginated<UserActivityItemDto, UseMyActivityParams>({
key: myActivityKey(),
fetcher,
params: params ?? {},
paginationKind: "cursor",
  });
}
