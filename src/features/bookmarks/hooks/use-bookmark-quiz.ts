'use client';

import { useCallback, useState } from 'react';
import type { Arguments } from 'swr';
import { mutate as globalMutate } from 'swr';

import {
type OptimisticToggleError,
isApiError,
useOptimisticToggle,
} from '@/lib/api';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { broadcastBookmarksInvalidated } from '@/lib/api/core/bookmarks-broadcast-channel';
import { addBookmark } from '@/features/bookmarks/api';
import {
bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
buildBookmarkedQuizIdSet,
bookmarkedQuizIdsKey,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useDefaultCollectionId } from '@/features/bookmarks/hooks/use-default-collection-id';
import { useUser } from '@/features/users/store/user-store';

export type BookmarkMutationOutcomeKind =
| 'success'
  | 'already_bookmarked'
  | 'no_collection'
  | 'reverted'
  | 'unauthenticated';

export interface BookmarkMutationOutcome {

kind: BookmarkMutationOutcomeKind;

cause: unknown;
}

export interface UseBookmarkQuizResult {

isPending: boolean;

lastError: OptimisticToggleError | null;

lastOutcome: BookmarkMutationOutcome | null;

bookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

async function pushOptimisticBookmarkedQuizIds(
quizId: string,
): Promise<void> {
const current = (await globalMutate(
KEY_MEMBERSHIP,
undefined,
{ revalidate: false },
  )) as unknown;

const priorList: ReadonlyArray<{
bookmarkId: string;
quizId: string;
quizTitle: string;
quizSlug: string;
quizImageUrl: string | null;
quizIsFeatured: boolean;
notes: string | null;
bookmarkedAt: string;
  }> = Array.isArray(current)
? (current as ReadonlyArray<{
bookmarkId: string;
quizId: string;
quizTitle: string;
quizSlug: string;
quizImageUrl: string | null;
quizIsFeatured: boolean;
notes: string | null;
bookmarkedAt: string;
      }>)
: [];

const nextList = [
...priorList,
{
bookmarkId: `optimistic-${quizId}`,
quizId,
quizTitle: '',
quizSlug: '',
quizImageUrl: null,
quizIsFeatured: false,
notes: null,
bookmarkedAt: new Date().toISOString(),
    },
  ];

await globalMutate(KEY_MEMBERSHIP, nextList, {
revalidate: false,
populateCache: true,
  });
}

async function rollbackOptimisticBookmarkedQuizIds(): Promise<void> {
await globalMutate(KEY_MEMBERSHIP, undefined, {
revalidate: true,
  });
}

export function useBookmarkQuiz(quizId: string): UseBookmarkQuizResult {
const { isAuthenticated } = useAuthState();
const { defaultCollectionId, isLoading: defaultCollectionLoading } =
useDefaultCollectionId();

const currentUser = useUser();

const [lastOutcome, setLastOutcome] =
useState<BookmarkMutationOutcome | null>(null);

const keysToInvalidate: Arguments[] = (isAuthenticated && quizId
? [
KEY_MEMBERSHIP,
KEY_COLLECTIONS,
['bookmark-status', quizId],
      ]
: []) as unknown as Arguments[];

const wrappedToggle = useCallback(async (): Promise<void> => {

if (!isAuthenticated || !quizId) {

setLastOutcome({ kind: 'unauthenticated', cause: null });

return;
    }

if (!defaultCollectionLoading && defaultCollectionId === null) {
setLastOutcome({ kind: 'no_collection', cause: null });
return;
    }

if (defaultCollectionLoading || defaultCollectionId === null) {
setLastOutcome({ kind: 'no_collection', cause: null });
return;
    }

await pushOptimisticBookmarkedQuizIds(quizId);

try {
await addBookmark(defaultCollectionId, { quizId });

if (currentUser?.userId) {
broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
setLastOutcome({ kind: 'success', cause: null });
return;
    } catch (cause: unknown) {

if (isApiError(cause) && cause.status === 409) {
if (currentUser?.userId) {
broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
setLastOutcome({ kind: 'already_bookmarked', cause: null });
return;
      }

await rollbackOptimisticBookmarkedQuizIds();
setLastOutcome({ kind: 'reverted', cause });
throw cause;
    }
  }, [isAuthenticated, quizId, defaultCollectionId, defaultCollectionLoading, currentUser]);

const { status, lastError, toggle } = useOptimisticToggle({
currentValue: false,
toggle: wrappedToggle,
keysToInvalidate,
  });

const bookmark = useCallback(async (): Promise<void> => {
if (!isAuthenticated || !quizId) {

setLastOutcome({ kind: 'unauthenticated', cause: null });
return NOOP();
    }
await toggle();
  }, [isAuthenticated, quizId, toggle]);

return {
isPending: status === 'pending',
lastError,
lastOutcome,
bookmark,
  };
}

export { buildBookmarkedQuizIdSet };
