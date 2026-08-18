

"use client";

import { useMemo, useCallback } from "react";
import { mutate as globalMutate } from "swr";

import { projectWithId, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
UseCursorPaginatedResult,
} from "@/lib/api/use-cursor-paginated.types";
import { listCollections } from "@/features/bookmarks/api";
import type {
BookmarkCollection,
BookmarkCollectionResponseDto,
} from "@/features/bookmarks/types";
import { toBookmarkCollection } from "@/features/bookmarks/types";

export const BOOKMARK_COLLECTIONS_KEY = [
"bookmark-collections",
"list",
] as const;

type ListCollectionsResponse = {
data?: { items: Array<Record<string, unknown>> };
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
};

export interface UseCollectionsResult extends UseCursorPaginatedResult<BookmarkCollection> {

collectionsMap: Map<string, BookmarkCollection>;

refresh: () => Promise<void>;
}

export function useCollections(params?: {
limit?: number;
}): UseCollectionsResult {

const fetcher = useMemo(
(): ((
args: CursorFetcherArgs<{ limit?: number }>,
    ) => Promise<CursorPage<BookmarkCollection>>) =>
async ({ cursor, params: fetcherParams, signal }) => {
const result =
(await listCollections()) as unknown as ListCollectionsResponse;

const items = (result.data?.items ?? []) as Array<
Record<string, unknown>
        >;
const mapped: BookmarkCollection[] = items.map((item) =>
toBookmarkCollection(
item as unknown as BookmarkCollectionResponseDto,
          ),
        );

const itemsWithId = mapped as unknown as Array<BookmarkCollection & { id: string }>;

const pagination = result.meta?.pagination;
return {
items: itemsWithId,
nextCursor: pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? itemsWithId.length,
        };
      },
[],
  );

const cursorResult = useCursorPaginated<
BookmarkCollection,
{ limit?: number }
  >({
key: BOOKMARK_COLLECTIONS_KEY,
fetcher,
params: { limit: params?.limit ?? 20 },
paginationKind: "cursor",
revalidateOnFocus: true,
  });

const collectionsMap = useMemo<Map<string, BookmarkCollection>>(() => {
const map = new Map<string, BookmarkCollection>();
for (const item of cursorResult.items) {
map.set(item.collectionId, item);
    }
return map;
  }, [cursorResult.items]);

const refresh = useCallback(async (): Promise<void> => {
await cursorResult.refresh();
  }, [cursorResult]);

return {
...cursorResult,
collectionsMap,
refresh,
  };
}

export async function invalidateCollections(): Promise<void> {
await globalMutate(BOOKMARK_COLLECTIONS_KEY, undefined, { revalidate: true });
}
