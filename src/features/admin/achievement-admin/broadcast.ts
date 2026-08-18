

import { getCurrentTabId } from '@/lib/api/core/broadcast-channel';
import { logger } from '@/shared/log';

import { invalidateAchievementAdmin } from './cache-keys';

export const ACHIEVEMENT_ADMIN_CHANNEL_NAME = 'phase7-admin-achievement' as const;

export type AchievementAdminEventType = 'admin:7.1.achievement-admin.invalidate';

export type AchievementAdminMutation = 'reevaluate' | 'revoke';

export interface BaseAchievementAdminEvent {
type: AchievementAdminEventType;

tabId: string;

timestamp: number;

action: AchievementAdminMutation;

userId: string;

badgeId?: string;

requestId: string;
}

export interface AchievementAdminInvalidatedEvent extends BaseAchievementAdminEvent {
type: 'admin:7.1.achievement-admin.invalidate';
}

export type AchievementAdminEvent = AchievementAdminInvalidatedEvent;

let achievementAdminChannel: BroadcastChannel | null = null;
let isAchievementAdminBroadcastChannelAvailable: boolean | null = null;

function checkBroadcastChannelAvailable(): boolean {
if (isAchievementAdminBroadcastChannelAvailable !== null) {
return isAchievementAdminBroadcastChannelAvailable;
  }

if (typeof BroadcastChannel === 'undefined') {
isAchievementAdminBroadcastChannelAvailable = false;
return false;
  }

try {
new BroadcastChannel('test');
isAchievementAdminBroadcastChannelAvailable = true;
  } catch {
isAchievementAdminBroadcastChannelAvailable = false;
  }

return isAchievementAdminBroadcastChannelAvailable;
}

function getAchievementAdminChannel(): BroadcastChannel | null {
if (typeof window === 'undefined') {
return null;
  }

if (!checkBroadcastChannelAvailable()) {
return null;
  }

if (achievementAdminChannel === null) {
achievementAdminChannel = new BroadcastChannel(ACHIEVEMENT_ADMIN_CHANNEL_NAME);
  }

return achievementAdminChannel;
}

export function closeAchievementAdminChannel(): void {
if (achievementAdminChannel !== null) {
achievementAdminChannel.close();
achievementAdminChannel = null;
  }
}

export function resetAchievementAdminBroadcastChannelAvailability(): void {
isAchievementAdminBroadcastChannelAvailable = null;
}

type AchievementAdminEventHandler = (event: AchievementAdminEvent) => void;

const achievementAdminSubscribers = new Set<AchievementAdminEventHandler>();

export function subscribeAchievementAdminInvalidate(
handler: AchievementAdminEventHandler,
): () => void {
achievementAdminSubscribers.add(handler);

return () => {
achievementAdminSubscribers.delete(handler);
  };
}

function dispatchToAchievementAdminSubscribers(
event: AchievementAdminEvent,
): void {
achievementAdminSubscribers.forEach((h) => {
try {
h(event);
    } catch (err) {
logger.error(
'admin.achievement.broadcast',
'Error in achievement admin event subscriber',
err,
      );
    }
  });
}

function handleAchievementAdminMessage(event: MessageEvent): void {
if (!event.data || typeof event.data !== 'object') {
return;
  }

const data = event.data as Partial<BaseAchievementAdminEvent>;

if (!data.type || data.type !== 'admin:7.1.achievement-admin.invalidate') {
return;
  }

if (!data.tabId || typeof data.tabId !== 'string') {
return;
  }

if (!data.action || !['reevaluate', 'revoke'].includes(data.action)) {
return;
  }

if (!data.userId || typeof data.userId !== 'string') {
return;
  }

const myTabId = getCurrentTabId();
if (data.tabId === myTabId) {
return;
  }

dispatchToAchievementAdminSubscribers(data as AchievementAdminInvalidatedEvent);
}

function initAchievementAdminChannel(): boolean {
const channel = getAchievementAdminChannel();

if (channel === null) {
return false;
  }

const channelObj = channel as unknown as { _listenerAdded?: boolean };
if (!channelObj._listenerAdded) {
channel.addEventListener('message', handleAchievementAdminMessage);
channelObj._listenerAdded = true;
  }

return true;
}

export function broadcastAchievementAdminMutation(
payload: {
action: AchievementAdminMutation;
userId: string;
badgeId?: string;
requestId: string;
  },
): void {
initAchievementAdminChannel();

const channel = getAchievementAdminChannel();
if (channel === null) {

return;
  }

if (!payload.userId || typeof payload.userId !== 'string') {
return;
  }

const fullEvent: AchievementAdminInvalidatedEvent = {
type: 'admin:7.1.achievement-admin.invalidate',
action: payload.action,
userId: payload.userId,
badgeId: payload.badgeId,
requestId: payload.requestId,
tabId: getCurrentTabId(),
timestamp: Date.now(),
  };

channel.postMessage(fullEvent);
}

export function handleAchievementAdminInvalidation(
event: AchievementAdminEvent,
): void {
void invalidateAchievementAdmin(event.userId);
}
