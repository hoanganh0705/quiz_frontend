

import {
getCurrentTabId,
} from '@/lib/api/core/broadcast-channel';

export const TAG_ADMIN_CHANNEL_NAME = 'phase7-admin-tag' as const;

import { logger } from '@/shared/log';

export type TagAdminEventType = 'admin:7.1.tag.invalidate';

export type TagAdminMutation = 'create' | 'update' | 'delete' | 'restore';

export interface BaseTagAdminEvent {
type: TagAdminEventType;

tabId: string;

timestamp: number;

mutation: TagAdminMutation;

tagId: string;
}

export interface TagAdminInvalidatedEvent extends BaseTagAdminEvent {
type: 'admin:7.1.tag.invalidate';
}

export type TagAdminEvent = TagAdminInvalidatedEvent;

let tagAdminChannel: BroadcastChannel | null = null;

let isTagAdminBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
if (isTagAdminBroadcastChannelAvailable !== null) {
return isTagAdminBroadcastChannelAvailable;
  }

if (typeof BroadcastChannel === 'undefined') {
isTagAdminBroadcastChannelAvailable = false;
return false;
  }

try {

new BroadcastChannel('test');
isTagAdminBroadcastChannelAvailable = true;
  } catch {
isTagAdminBroadcastChannelAvailable = false;
  }

return isTagAdminBroadcastChannelAvailable;
}

export function getTagAdminChannel(): BroadcastChannel | null {
if (typeof window === 'undefined') {
return null;
  }

if (!checkBroadcastChannelAvailable()) {
return null;
  }

if (tagAdminChannel === null) {
tagAdminChannel = new BroadcastChannel(TAG_ADMIN_CHANNEL_NAME);
  }

return tagAdminChannel;
}

export function closeTagAdminChannel(): void {
if (tagAdminChannel !== null) {
tagAdminChannel.close();
tagAdminChannel = null;
  }
}

type TagAdminEventHandler = (event: TagAdminEvent) => void;

const tagAdminSubscribers = new Set<TagAdminEventHandler>();

export function subscribeTagAdminInvalidate(
handler: TagAdminEventHandler,
): () => void {
tagAdminSubscribers.add(handler);

return () => {
tagAdminSubscribers.delete(handler);
  };
}

function dispatchToTagAdminSubscribers(event: TagAdminEvent): void {
tagAdminSubscribers.forEach((handler) => {
try {
handler(event);
    } catch (err) {

logger.error('admin.tag.broadcast', 'Error in tag admin event subscriber', err);
    }
  });
}

function handleTagAdminMessage(event: MessageEvent): void {

if (!event.data || typeof event.data !== 'object') {
return;
  }

const data = event.data as Partial<TagAdminInvalidatedEvent>;

if (!data.type || data.type !== 'admin:7.1.tag.invalidate') {
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

if (!data.tagId || typeof data.tagId !== 'string') {
return;
  }

const myTabId = getCurrentTabId();
if (data.tabId === myTabId) {
return;
  }

dispatchToTagAdminSubscribers(data as TagAdminEvent);
}

export function initTagAdminChannel(): boolean {
const channel = getTagAdminChannel();

if (channel === null) {
return false;
  }

if (!(channel as unknown as { _listenerAdded?: boolean })._listenerAdded) {
channel.addEventListener('message', handleTagAdminMessage);
(channel as unknown as { _listenerAdded?: boolean })._listenerAdded = true;
  }

return true;
}

export function broadcastTagAdminInvalidate(
mutation: TagAdminMutation,
tagId: string,
): void {

initTagAdminChannel();

const channel = getTagAdminChannel();
if (channel === null) {

return;
  }

if (!tagId || typeof tagId !== 'string') {

return;
  }

const fullEvent: TagAdminInvalidatedEvent = {
type: 'admin:7.1.tag.invalidate',
mutation,
tagId,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  };

channel.postMessage(fullEvent);
}
