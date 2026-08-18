

"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { mutate as globalMutate } from "swr";

import { ApiError, isApiError } from "@/lib/api";
import type {
CursorFetcherArgs,
CursorPage,
} from "@/lib/api/use-cursor-paginated.types";
import { useAuthState } from "@/features/auth/hooks/use-auth-state";
import { listBookmarksInCollection } from "@/features/bookmarks/api";
import type {
CollectionQuiz,
BookmarkedQuizResponseDto,
} from "@/features/bookmarks/types";
import {
toCollectionQuiz,
collectionQuizzesKey,
} from "@/features/bookmarks/types";

export interface UseCollectionQuizzesResult {

quizzes: readonly CollectionQuiz[];

cursor: string | null;

hasMore: boolean;

isLoading: boolean;

isLoadingMore: boolean;

error: ApiError | null;

loadMore: () => void;

refresh: () => Promise<void>;
}

interface BookmarksListResponse {
data?: {
items?: Array<Record<string, unknown>>;
  };
meta?: {
pagination?: {
kind: "cursor";
limit: number;
nextCursor: string | null;
hasNextPage: boolean;
    };
  };
}

export function useCollectionQuizzes(
collectionId: string | null | undefined,
): UseCollectionQuizzesResult {
const { isAuthenticated } = useAuthState();

const fetcher = useMemo(
(): ((
args: CursorFetcherArgs<Record<string, never>>,
    ) => Promise<CursorPage<CollectionQuiz>>) =>
async ({ cursor }) => {
const result = (await listBookmarksInCollection(
collectionId!,
        )) as unknown as BookmarksListResponse;

const items = (result.data?.items ?? []) as Array<
Record<string, unknown>
        >;
const quizzes: CollectionQuiz[] = items.map((item) =>
toCollectionQuiz(item as unknown as BookmarkedQuizResponseDto),
        );

const itemsWithId = quizzes as unknown as Array<{ id: string }>;

const pagination = result.meta?.pagination;

return {
items: itemsWithId as unknown as CollectionQuiz[] &
Array<{ id: string }>,
nextCursor: cursor ?? pagination?.nextCursor ?? null,
hasNextPage: pagination?.hasNextPage ?? false,
limit: pagination?.limit ?? itemsWithId.length,
        };
      },
[collectionId],
  );

const swrKey =
collectionId && isAuthenticated ? collectionQuizzesKey(collectionId) : null;

const swr = useSWR(
swrKey,
() => fetcher({ cursor: null, params: {}, signal: undefined }),
{
revalidateOnFocus: true,
    },
  );

const data = swr.data;
const quizzes: readonly CollectionQuiz[] = data?.items ?? [];

const cursor = data?.nextCursor ?? null;
const hasMore = data?.hasNextPage ?? true;

const isLoading = swr.isLoading;
const isLoadingMore = swr.isValidating && quizzes.length > 0;

const error: ApiError | null = (() => {
const first = swr.error;
if (!first) return null;
if (isApiError(first)) return first;
if (first && typeof first === "object" && "status" in first) {
return first as unknown as ApiError;
    }
return {
status: 0,
message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

const refresh = async (): Promise<void> => {
if (swrKey) {
await globalMutate(swrKey, undefined, { revalidate: true });
    }
  };

const loadMore = (): void => {

void refresh();
  };

return {
quizzes,
cursor,
hasMore,
isLoading,
isLoadingMore,
error,
loadMore,
refresh,
  };
}
