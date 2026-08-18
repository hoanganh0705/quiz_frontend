

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

export const CATEGORY_ADMIN_CHANNEL_NAME = 'phase7-admin-category' as const;

export type CategoryAdminEventType = 'admin:7.1.category.invalidate';

export type CategoryAdminMutation = 'create' | 'update' | 'delete' | 'restore';

export interface BaseCategoryAdminEvent {
type: CategoryAdminEventType;
tabId: string;
timestamp: number;
mutation: CategoryAdminMutation;
categoryId: string;
}

export interface CategoryAdminInvalidatedEvent extends BaseCategoryAdminEvent {
type: 'admin:7.1.category.invalidate';
}

export type CategoryAdminEvent = CategoryAdminInvalidatedEvent;

let categoryAdminChannel: BroadcastChannel | null = null;

let isCategoryAdminBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
if (isCategoryAdminBroadcastChannelAvailable !== null) {
return isCategoryAdminBroadcastChannelAvailable;
  }

if (typeof BroadcastChannel === 'undefined') {
isCategoryAdminBroadcastChannelAvailable = false;
return false;
  }

try {
new BroadcastChannel('test');
isCategoryAdminBroadcastChannelAvailable = true;
  } catch {
isCategoryAdminBroadcastChannelAvailable = false;
  }

return isCategoryAdminBroadcastChannelAvailable;
}

export function getCategoryAdminChannel(): BroadcastChannel | null {
if (typeof window === 'undefined') {
return null;
  }

if (!checkBroadcastChannelAvailable()) {
return null;
  }

if (categoryAdminChannel === null) {
categoryAdminChannel = new BroadcastChannel(CATEGORY_ADMIN_CHANNEL_NAME);
  }

return categoryAdminChannel;
}

export function closeCategoryAdminChannel(): void {
if (categoryAdminChannel !== null) {
categoryAdminChannel.close();
categoryAdminChannel = null;
  }
}

type CategoryAdminEventHandler = (event: CategoryAdminEvent) => void;

const categoryAdminSubscribers = new Set<CategoryAdminEventHandler>();

export function subscribeCategoryAdminInvalidate(
handler: CategoryAdminEventHandler,
): () => void {
categoryAdminSubscribers.add(handler);

return () => {
categoryAdminSubscribers.delete(handler);
  };
}

function dispatchToCategoryAdminSubscribers(event: CategoryAdminEvent): void {
categoryAdminSubscribers.forEach((handler) => {
try {
handler(event);
    } catch (err) {
logger.error(
'admin.category.broadcast',
'Error in category admin event subscriber',
err,
      );
    }
  });
}

function handleCategoryAdminMessage(event: MessageEvent): void {
if (!event.data || typeof event.data !== 'object') {
return;
  }

const data = event.data as Partial<CategoryAdminInvalidatedEvent>;

if (!data.type || data.type !== 'admin:7.1.category.invalidate') {
return;
  }

if (!data.tabId || typeof data.tabId !== 'string') {
return;
  }

if (
!data.mutation ||
!['create', 'update', 'delete', 'restore'].includes(data.mutation)
  ) {
return;
  }

if (!data.categoryId || typeof data.categoryId !== 'string') {
return;
  }

const myTabId = getCurrentTabId();
if (data.tabId === myTabId) {
return;
  }

dispatchToCategoryAdminSubscribers(data as CategoryAdminEvent);
}

export function initCategoryAdminChannel(): boolean {
const channel = getCategoryAdminChannel();

if (channel === null) {
return false;
  }

if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
channel.addEventListener('message', handleCategoryAdminMessage);
(channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

return true;
}

export function broadcastCategoryAdminInvalidate(
mutation: CategoryAdminMutation,
categoryId: string,
): void {
initCategoryAdminChannel();

const channel = getCategoryAdminChannel();
if (channel === null) {
return;
  }

if (!categoryId || typeof categoryId !== 'string') {
return;
  }

const fullEvent: CategoryAdminInvalidatedEvent = {
type: 'admin:7.1.category.invalidate',
mutation,
categoryId,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  };

channel.postMessage(fullEvent);
}