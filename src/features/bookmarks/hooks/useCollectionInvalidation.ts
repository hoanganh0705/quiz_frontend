/**
 * `useCollectionInvalidation.ts` — Epic 4.7 collection-specific cross-tab cache invalidation.
 *
 * Source epic:   Epic 4.7 — Collection detail + bulk add/remove + analytics.
 * Source ticket: EPIC-4.7-B1-3.
 *
 * ## What this hook/service provides
 *
 *   - Broadcast functions for collection-specific invalidation events:
 *       - `invalidateCollectionQuizzes(collectionId)` — triggers quiz list refresh
 *       - `invalidateCollectionAnalytics(collectionId)` — triggers analytics refresh
 *   - SWR key constants for targeted invalidation:
 *       - `collectionQuizzesKey(collectionId)` — for quiz list cache
 *       - `collectionAnalyticsKey(collectionId)` — for analytics cache
 *   - Hook `useCollectionInvalidation(collectionId)` — subscribes to cross-tab events
 *     and provides memoized invalidation callbacks.
 *
 * ## Pattern
 *
 * Follows the existing `bookmarks-broadcast-channel.ts` pattern:
 *   - Uses the existing `BOOKMARKS_CHANNEL_NAME` channel
 *   - Adds new event types for collection-specific invalidation
 *   - Reuses `getCurrentTabId()` for same-tab filtering
 *
 * ## Events
 *
 * | Type | Direction | Payload |
 * |------|-----------|---------|
 * | `collection/quizzes-invalidated` | → other tabs | `collectionId`, `userId`, `tabId`, `timestamp` |
 * | `collection/analytics-invalidated` | → other tabs | `collectionId`, `userId`, `tabId`, `timestamp` |
 *
 * @see bookmarks-broadcast-channel.ts — base broadcast channel
 */

'use client';

import { useCallback, useEffect } from 'react';
import { mutate as globalMutate } from 'swr';

import { getBookmarksChannel, subscribeToBookmarkEvents } from '@/lib/api/core/bookmarks-broadcast-channel';
import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import { useUser } from '@/features/users/store/user-store';

// ─── Event Types ───────────────────────────────────────────────────────────────

/**
 * Event type for collection quiz list invalidation.
 */
export type CollectionQuizzesInvalidatedEvent = {
  type: 'collection/quizzes-invalidated';
  collectionId: string;
  userId: string;
  tabId: string;
  timestamp: number;
};

/**
 * Event type for collection analytics invalidation.
 */
export type CollectionAnalyticsInvalidatedEvent = {
  type: 'collection/analytics-invalidated';
  collectionId: string;
  userId: string;
  tabId: string;
  timestamp: number;
};

/**
 * Union of all collection invalidation events.
 */
export type CollectionInvalidationEvent =
  | CollectionQuizzesInvalidatedEvent
  | CollectionAnalyticsInvalidatedEvent;

// ─── Event Broadcasting ────────────────────────────────────────────────────────

/**
 * Broadcast a collection quizzes invalidation event to all other tabs.
 *
 * @param collectionId - The collection whose quizzes changed.
 * @param userId - The authenticated user ID.
 */
export function broadcastCollectionQuizzesInvalidated(params: {
  collectionId: string;
  userId: string;
}): void {
  // Ensure channel is initialized
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

/**
 * Broadcast a collection analytics invalidation event to all other tabs.
 *
 * @param collectionId - The collection whose analytics changed.
 * @param userId - The authenticated user ID.
 */
export function broadcastCollectionAnalyticsInvalidated(params: {
  collectionId: string;
  userId: string;
}): void {
  // Ensure channel is initialized
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

// ─── SWR Key Helpers ───────────────────────────────────────────────────────────

/**
 * SWR key for collection quizzes list.
 */
export function collectionQuizzesSWRKey(collectionId: string) {
  return ['bookmark-collections', 'detail', collectionId, 'quizzes'] as const;
}

/**
 * SWR key for collection analytics.
 */
export function collectionAnalyticsSWRKey(collectionId: string) {
  return ['bookmark-collections', 'detail', collectionId, 'analytics'] as const;
}

// ─── Local Cache Invalidation ─────────────────────────────────────────────────

/**
 * Invalidate the local SWR cache for collection quizzes.
 * Called after local mutations or when receiving cross-tab events.
 */
export async function invalidateCollectionQuizzesCache(collectionId: string): Promise<void> {
  const key = collectionQuizzesSWRKey(collectionId);
  await globalMutate(key, undefined, { revalidate: true });
}

/**
 * Invalidate the local SWR cache for collection analytics.
 * Called after local mutations or when receiving cross-tab events.
 */
export async function invalidateCollectionAnalyticsCache(collectionId: string): Promise<void> {
  const key = collectionAnalyticsSWRKey(collectionId);
  await globalMutate(key, undefined, { revalidate: true });
}

/**
 * Invalidate both quizzes and analytics cache for a collection.
 */
export async function invalidateCollectionCache(collectionId: string): Promise<void> {
  await Promise.all([
    invalidateCollectionQuizzesCache(collectionId),
    invalidateCollectionAnalyticsCache(collectionId),
  ]);
}

// ─── Message Handler ──────────────────────────────────────────────────────────

/**
 * Handle incoming bookmark broadcast messages.
 * Filters collection-specific events and invalidates local cache.
 */
function handleBookmarkMessage(event: MessageEvent): void {
  const data = event.data as Partial<CollectionInvalidationEvent>;

  // Only handle collection-specific events
  if (!data.type || !data.type.startsWith('collection/')) {
    return;
  }

  // Must have a tabId for same-tab filtering
  if (!data.tabId || typeof data.tabId !== 'string') {
    return;
  }

  // Filter out same-tab broadcasts
  const myTabId = getCurrentTabId();
  if (data.tabId === myTabId) {
    return;
  }

  // Handle based on event type
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
      // Unknown event type — ignore
      break;
  }
}

// ─── Initialization ───────────────────────────────────────────────────────────

/**
 * Flag to track if we've subscribed to bookmark messages.
 */
let isSubscribed = false;

/**
 * Subscribe to bookmark broadcast messages for collection invalidation.
 * Safe to call multiple times — only subscribes once.
 */
function ensureSubscribed(): void {
  if (isSubscribed) return;

  const channel = getBookmarksChannel();
  if (channel === null) return;

  channel.addEventListener('message', handleBookmarkMessage);
  isSubscribed = true;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Result returned by `useCollectionInvalidation`.
 */
export interface UseCollectionInvalidationResult {
  /**
   * Invalidate quizzes cache for this collection.
   * Broadcasts to other tabs and invalidates local cache.
   */
  invalidateQuizzes: () => void;
  /**
   * Invalidate analytics cache for this collection.
   * Broadcasts to other tabs and invalidates local cache.
   */
  invalidateAnalytics: () => void;
  /**
   * Invalidate both quizzes and analytics for this collection.
   */
  invalidateAll: () => void;
}

/**
 * Hook for collection-specific cross-tab cache invalidation.
 *
 * @param collectionId - The collection to track for invalidation events.
 * @returns Functions to trigger invalidation.
 *
 * @example
 * ```tsx
 * function CollectionPage({ collectionId }: { collectionId: string }) {
 *   const { invalidateQuizzes, invalidateAnalytics } = useCollectionInvalidation(collectionId);
 *
 *   const handleBulkAdd = async () => {
 *     await addQuizzes(collectionId, quizIds);
 *     invalidateQuizzes();
 *     invalidateAnalytics();
 *   };
 *
 *   // ...
 * }
 * ```
 */
export function useCollectionInvalidation(
  collectionId: string,
): UseCollectionInvalidationResult {
  const user = useUser();

  // Ensure we subscribe to bookmark messages on mount
  useEffect(() => {
    ensureSubscribed();
  }, []);

  const invalidateQuizzes = useCallback(() => {
    if (!collectionId || !user?.userId) return;
    // Invalidate local cache
    void invalidateCollectionQuizzesCache(collectionId);
    // Broadcast to other tabs
    broadcastCollectionQuizzesInvalidated({
      collectionId,
      userId: user.userId,
    });
  }, [collectionId, user?.userId]);

  const invalidateAnalytics = useCallback(() => {
    if (!collectionId || !user?.userId) return;
    // Invalidate local cache
    void invalidateCollectionAnalyticsCache(collectionId);
    // Broadcast to other tabs
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
