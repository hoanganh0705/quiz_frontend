

import { createBroadcastChannel } from '@/lib/broadcast';

export const BOOKMARKS_CHANNEL_NAME = 'bookmarks';

export type BookmarkEventType = 'bookmarks/invalidated';

export interface BaseBookmarkEvent {
type: BookmarkEventType;

tabId: string;

timestamp: number;
}

export interface BookmarksInvalidatedEvent extends BaseBookmarkEvent {
type: 'bookmarks/invalidated';

userId: string;
}

export type BookmarkEvent = BookmarksInvalidatedEvent;

const bookmarksChannel = createBroadcastChannel<BookmarkEvent>(BOOKMARKS_CHANNEL_NAME, {
validate: (data): BookmarkEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<BookmarksInvalidatedEvent>;
if (d.type !== 'bookmarks/invalidated') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
return d as BookmarkEvent;
  },
});

export function closeBookmarksChannel(): void {
bookmarksChannel.closeChannel();
}

export function getBookmarksChannel(): BroadcastChannel | null {
return bookmarksChannel.getChannel();
}

export function initBookmarksChannel(): boolean {

return bookmarksChannel.isAvailable();
}

export function subscribeToBookmarkEvents(
handler: (event: BookmarkEvent) => void,
): () => void {
return bookmarksChannel.subscribe(handler);
}

export function broadcastBookmarksInvalidated(params: {
userId: string;
}): void {

bookmarksChannel.ensureChannel();
if (!params.userId || typeof params.userId !== 'string') {

return;
  }
bookmarksChannel.publish({
type: 'bookmarks/invalidated',
userId: params.userId,
  });
}
