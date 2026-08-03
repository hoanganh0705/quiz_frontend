/**
 * `useMyActivity` — cursor-paginated activity feed for the authenticated user.
 *
 * Source epic:   Epic 4.5 — Personal activity feed + ranking + badges + tournament history + my-attempts list.
 * Source ticket: T-4.5-B1.
 *
 * Wraps `listMyActivity` from `users.profile.service.ts` in `useCursorPaginated`.
 *
 * ## Fetcher adapter
 *
 * The fetcher reads `cursor`, calls the service, and:
 *   1. Unwraps the wire envelope `{ data, meta }` to `CursorPage<ActivityItem>`.
 *   2. Synthesises `id` from `activity.id` so `appendUniqueById` deduplication works.
 *
 * ## SWR key
 *
 * The key is `['users', 'me', 'activity']`. Changing the key resets pagination.
 */

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

/** Wire envelope returned by `listMyActivity` (post-unwrap). */
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

/**
 * Public return type. Extends `UseCursorPaginatedResult` with the `ActivityItem` item type.
 */
export type UseMyActivityResult = UseCursorPaginatedResult<UserActivityItemDto>;

/**
 * Cursor-paginated list of activity events for the authenticated user.
 */
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
          // 404 → treat as empty page (not an error state).
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
