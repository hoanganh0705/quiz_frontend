

'use client';

import { useCallback, useEffect } from 'react';
import { mutate as globalMutate } from 'swr';

import { getBookmarksChannel, subscribeToBookmarkEvents } from '@/lib/api/core/bookmarks-broadcast-channel';
import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useUser } from '@/features/users/store/user-store';

export type CollectionQuizzesInvalidatedEvent = {
type: 'collection/quizzes-invalidated';
collectionId: string;
userId: string;
tabId: string;
timestamp: number;
};

export type CollectionAnalyticsInvalidatedEvent = {
type: 'collection/analytics-invalidated';
collectionId: string;
userId: string;
tabId: string;
timestamp: number;
};

export type CollectionInvalidationEvent =
| CollectionQuizzesInvalidatedEvent
  | CollectionAnalyticsInvalidatedEvent;

export function broadcastCollectionQuizzesInvalidated(params: {
collectionId: string;
userId: string;
}): void {

const channel = getBookmarksChannel();
if (channel === null) {
return;
  }

const event: CollectionQuizzesInvalidatedEvent = {
type: 'collection/quizzes-invalidated',
collectionId: params.collectionId,
userId: params.userId,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  };

channel.postMessage(event);
}

export function broadcastCollectionAnalyticsInvalidated(params: {
collectionId: string;
userId: string;
}): void {

const channel = getBookmarksChannel();
if (channel === null) {
return;
  }

const event: CollectionAnalyticsInvalidatedEvent = {
type: 'collection/analytics-invalidated',
collectionId: params.collectionId,
userId: params.userId,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  };

channel.postMessage(event);
}

export function collectionQuizzesSWRKey(collectionId: string) {
return ['bookmark-collections', 'detail', collectionId, 'quizzes'] as const;
}

export function collectionAnalyticsSWRKey(collectionId: string) {
return ['bookmark-collections', 'detail', collectionId, 'analytics'] as const;
}

export async function invalidateCollectionQuizzesCache(collectionId: string): Promise<void> {
const key = collectionQuizzesSWRKey(collectionId);
await globalMutate(key, undefined, { revalidate: true });
}

export async function invalidateCollectionAnalyticsCache(collectionId: string): Promise<void> {
const key = collectionAnalyticsSWRKey(collectionId);
await globalMutate(key, undefined, { revalidate: true });
}

export async function invalidateCollectionCache(collectionId: string): Promise<void> {
await Promise.all([
invalidateCollectionQuizzesCache(collectionId),
invalidateCollectionAnalyticsCache(collectionId),
  ]);
}

function handleBookmarkMessage(event: MessageEvent): void {
const data = event.data as Partial<CollectionInvalidationEvent>;

if (!data.type || !data.type.startsWith('collection/')) {
return;
  }

if (!data.tabId || typeof data.tabId !== 'string') {
return;
  }

const myTabId = getCurrentTabId();
if (data.tabId === myTabId) {
return;
  }

switch (data.type) {
case 'collection/quizzes-invalidated': {
const quizzesEvent = data as CollectionQuizzesInvalidatedEvent;
void invalidateCollectionQuizzesCache(quizzesEvent.collectionId);
break;
    }
case 'collection/analytics-invalidated': {
const analyticsEvent = data as CollectionAnalyticsInvalidatedEvent;
void invalidateCollectionAnalyticsCache(analyticsEvent.collectionId);
break;
    }
default:

break;
  }
}

let isSubscribed = false;

function ensureSubscribed(): void {
if (isSubscribed) return;

const channel = getBookmarksChannel();
if (channel === null) return;

channel.addEventListener('message', handleBookmarkMessage);
isSubscribed = true;
}

export interface UseCollectionInvalidationResult {

invalidateQuizzes: () => void;

invalidateAnalytics: () => void;

invalidateAll: () => void;
}

export function useCollectionInvalidation(
collectionId: string,
): UseCollectionInvalidationResult {
const user = useUser();

useEffect(() => {
ensureSubscribed();
  }, []);

const invalidateQuizzes = useCallback(() => {
if (!collectionId || !user?.userId) return;

void invalidateCollectionQuizzesCache(collectionId);

broadcastCollectionQuizzesInvalidated({
collectionId,
userId: user.userId,
    });
  }, [collectionId, user?.userId]);

const invalidateAnalytics = useCallback(() => {
if (!collectionId || !user?.userId) return;

void invalidateCollectionAnalyticsCache(collectionId);

broadcastCollectionAnalyticsInvalidated({
collectionId,
userId: user.userId,
    });
  }, [collectionId, user?.userId]);

const invalidateAll = useCallback(() => {
invalidateQuizzes();
invalidateAnalytics();
  }, [invalidateQuizzes, invalidateAnalytics]);

return {
invalidateQuizzes,
invalidateAnalytics,
invalidateAll,
  };
}
