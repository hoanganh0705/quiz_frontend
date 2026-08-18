'use client';

import { useEffect } from 'react';
import { mutate as globalMutate } from 'swr';

import {
subscribeToBookmarkEvents,
} from '@/lib/api/core/bookmarks-broadcast-channel';
import {
bookmarkCollectionsKey,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
bookmarkedQuizIdsKey,
useBookmarkedQuizIds,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import { useUser } from '@/features/users/store/user-store';

const KEY_MEMBERSHIP = bookmarkedQuizIdsKey() as unknown as readonly unknown[];
const KEY_COLLECTIONS = bookmarkCollectionsKey() as unknown as readonly unknown[];

export function BookmarksLookupHydrator(): null {

useBookmarkedQuizIds();

const currentUser = useUser();
const currentUserId = currentUser?.userId ?? null;

useEffect(() => {

if (currentUserId === null) {
return undefined;
    }

const unsubscribe = subscribeToBookmarkEvents((event) => {

if (event.type !== 'bookmarks/invalidated') {
return;
      }

if (event.userId !== currentUserId) {
return;
      }

void Promise.all([
globalMutate(KEY_MEMBERSHIP, undefined, { revalidate: true }),
globalMutate(KEY_COLLECTIONS, undefined, { revalidate: true }),
      ]);
    });

return unsubscribe;
  }, [currentUserId]);

return null;
}
