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
import {
getBookmarkStatus,
removeBookmark,
} from '@/features/bookmarks/api';
import {
bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
bookmarkedQuizIdsKey,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useUser } from '@/features/users/store/user-store';

export type UnbookmarkMutationOutcomeKind =
| 'success'
  | 'already_unbookmarked'
  | 'reverted'
  | 'unauthenticated';

export interface UnbookmarkMutationOutcome {

kind: UnbookmarkMutationOutcomeKind;

cause: unknown;
}

export interface UseUnbookmarkQuizResult {

isPending: boolean;

lastError: OptimisticToggleError | null;

lastOutcome: UnbookmarkMutationOutcome | null;

unbookmark: () => Promise<void>;
}

const NOOP = async (): Promise<void> => {
return;
};

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

async function pushOptimisticBookmarkedQuizIdRemoval(
quizId: string,
): Promise<void> {
const current = (await globalMutate(
KEY_MEMBERSHIP,
undefined,
{ revalidate: false },
  )) as unknown;

const priorList: ReadonlyArray<{ quizId: string }> = Array.isArray(current)
? (current as ReadonlyArray<{ quizId: string }>)
: [];

const nextList = priorList.filter(
(item) => item && item.quizId !== quizId,
  );

await globalMutate(KEY_MEMBERSHIP, nextList, {
revalidate: false,
populateCache: true,
  });
}

async function rollbackOptimisticBookmarkedQuizIdRemoval(): Promise<void> {
await globalMutate(KEY_MEMBERSHIP, undefined, {
revalidate: true,
  });
}

export function useUnbookmarkQuiz(quizId: string): UseUnbookmarkQuizResult {
const { isAuthenticated } = useAuthState();

const currentUser = useUser();

const [lastOutcome, setLastOutcome] =
useState<UnbookmarkMutationOutcome | null>(null);

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

let statusCollections: ReadonlyArray<{ collectionId: string }> = [];
try {
const status = await getBookmarkStatus(quizId);

const data = (status as unknown as { data?: { collections?: Array<{ collectionId: string }> } })?.data;
statusCollections = data?.collections ?? [];
    } catch {

setLastOutcome({ kind: 'reverted', cause: undefined });
throw new Error('status fetch failed');
    }

if (statusCollections.length === 0) {
await Promise.all(
keysToInvalidate.map((key) =>
globalMutate(key as Parameters<typeof globalMutate>[0], undefined, { revalidate: true }),
        ),
      );

if (currentUser?.userId) {
broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
setLastOutcome({ kind: 'already_unbookmarked', cause: null });
return;
    }

const targetCollectionId = statusCollections[0]!.collectionId;

await pushOptimisticBookmarkedQuizIdRemoval(quizId);

try {
await removeBookmark(targetCollectionId, quizId);

if (currentUser?.userId) {
broadcastBookmarksInvalidated({ userId: currentUser.userId });
      }
setLastOutcome({ kind: 'success', cause: null });
return;
    } catch (cause: unknown) {

if (isApiError(cause) && cause.status === 404) {
if (currentUser?.userId) {
broadcastBookmarksInvalidated({ userId: currentUser.userId });
        }
setLastOutcome({ kind: 'success', cause });
return;
      }

await rollbackOptimisticBookmarkedQuizIdRemoval();
setLastOutcome({ kind: 'reverted', cause });
throw cause;
    }
  }, [isAuthenticated, quizId, keysToInvalidate, currentUser]);

const { status, lastError, toggle } = useOptimisticToggle({
currentValue: true,
toggle: wrappedToggle,
keysToInvalidate,
  });

const unbookmark = useCallback(async (): Promise<void> => {
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
unbookmark,
  };
}