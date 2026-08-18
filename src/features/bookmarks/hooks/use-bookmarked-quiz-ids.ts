'use client';

import { useMemo } from 'react';
import useSWR from 'swr';

import { ApiError, isApiError } from '@/lib/api';
import type { BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { listBookmarksInCollection } from '@/features/bookmarks/api';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';

export const bookmarkedQuizIdsKey = () => ['bookmarked-quiz-ids'] as const;

export interface UseBookmarkedQuizIdsResult {

quizIds: ReadonlySet<string>;

isLoading: boolean;

error: ApiError | null;

mutate: () => Promise<unknown>;
}

export function buildBookmarkedQuizIdSet(
memberLists: ReadonlyArray<ReadonlyArray<BookmarkedQuizResponseDto>>,
): ReadonlySet<string> {

const union = new Set<string>();
for (const list of memberLists) {
for (const bookmark of list) {
if (typeof bookmark.quizId === 'string' && bookmark.quizId.length > 0) {
union.add(bookmark.quizId);
      }
    }
  }
return union;
}

const EMPTY_FETCHER = async (): Promise<ReadonlyArray<never>> => [];

export function useBookmarkedQuizIds(): UseBookmarkedQuizIdsResult {
const { isAuthenticated } = useAuthState();
const { collections, isLoading: collectionsLoading } = useBookmarkCollections();

const collectionIdsKey = useMemo(
() => collections.map((c) => c.collectionId).sort().join('|'),
[collections],
  );

const swrKey = isAuthenticated && !collectionsLoading
? (['bookmarked-quiz-ids', collectionIdsKey] as const)
: null;

const fetcher = swrKey
? async (): Promise<ReadonlyArray<BookmarkedQuizResponseDto>> => {
if (collections.length === 0) {
return EMPTY_FETCHER();
        }
const perCollection = await Promise.all(
collections.map((c) =>
listBookmarksInCollection(c.collectionId).then(
(page) => page?.data?.items ?? [],
            ),
          ),
        );

return perCollection.flat();
      }
: null;

const swr = useSWR(swrKey, fetcher, {

revalidateOnFocus: false,
  });

const quizIds = useMemo<ReadonlySet<string>>(
() => buildBookmarkedQuizIdSet([swr.data ?? []]),
[swr.data],
  );

const isLoading = !isAuthenticated
? false
: collectionsLoading || (swr.isLoading && Boolean(swrKey));

const error: ApiError | null = (() => {
const first = swr.error;
if (!first) return null;
if (isApiError(first)) return first;
if (first && typeof first === 'object' && 'status' in first) {
return first as unknown as ApiError;
    }
return {
status: 0,
message: first instanceof Error ? first.message : String(first),
    } as unknown as ApiError;
  })();

return {
quizIds,
isLoading,
error,
mutate: swr.mutate,
  };
}