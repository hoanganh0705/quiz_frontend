

import { createBroadcastChannel } from '@/lib/broadcast';

const PROFILE_VALID_KINDS = new Set(['me', 'settings', 'avatar', 'preferences']);

export const PROFILE_CHANNEL_NAME = 'profile';

export type ProfileEventType = 'profile/updated';

export type ProfileUpdateKind =
| 'me'
  | 'settings'
  | 'avatar'
  | 'preferences';

export interface BaseProfileEvent {
type: ProfileEventType;
tabId: string;
timestamp: number;
}

export interface ProfileUpdatedEvent extends BaseProfileEvent {
type: 'profile/updated';

userId: string;

kind: ProfileUpdateKind;
}

export type ProfileEvent = ProfileUpdatedEvent;

const profileChannel = createBroadcastChannel<ProfileEvent>(PROFILE_CHANNEL_NAME, {
validate: (data): ProfileEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<ProfileUpdatedEvent>;
if (d.type !== 'profile/updated') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
if (typeof d.kind !== 'string' || !PROFILE_VALID_KINDS.has(d.kind)) return null;
return d as ProfileEvent;
  },
});

export function closeProfileChannel(): void {
profileChannel.closeChannel();
}

export function getProfileChannel(): BroadcastChannel | null {
return profileChannel.getChannel();
}

export function subscribeToProfileEvents(
handler: (event: ProfileEvent) => void,
): () => void {
return profileChannel.subscribe(handler);
}

export function broadcastProfileUpdated(params: {
userId: string;
kind: ProfileUpdateKind;
}): void {

profileChannel.ensureChannel();
if (!params.userId || typeof params.userId !== 'string' || !params.kind) {
return;
  }
profileChannel.publish({
type: 'profile/updated',
userId: params.userId,
kind: params.kind,
  });
}
