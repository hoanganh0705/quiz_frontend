

import { createBroadcastChannel } from '@/lib/broadcast';

export const SOCIAL_RELATIONSHIP_CHANNEL_NAME = 'social/relationship';

export type SocialRelationshipInvalidationKind =
| 'relationship.changed'
  | 'friend_request.changed'
  | 'blocklist.changed'
  | 'follow.changed'
  | 'unfriended';

const SOCIAL_RELATIONSHIP_VALID_KINDS = new Set<SocialRelationshipInvalidationKind>([
'relationship.changed',
'friend_request.changed',
'blocklist.changed',
'follow.changed',
'unfriended',
]);

interface BaseSocialRelationshipInvalidationEvent {

kind: SocialRelationshipInvalidationKind;

userId: string;

tabId: string;

at: number;
}

export type SocialRelationshipInvalidationEvent =
BaseSocialRelationshipInvalidationEvent;

export type SocialRelationshipInvalidationPayload = {
kind: SocialRelationshipInvalidationKind;
userId: string;
};

const socialRelationshipChannel = createBroadcastChannel<SocialRelationshipInvalidationEvent>(
SOCIAL_RELATIONSHIP_CHANNEL_NAME,
{
validate: (data): SocialRelationshipInvalidationEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<BaseSocialRelationshipInvalidationEvent>;
if (typeof d.kind !== 'string' || !SOCIAL_RELATIONSHIP_VALID_KINDS.has(d.kind as SocialRelationshipInvalidationKind)) {
return null;
      }
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.userId !== 'string' || d.userId.length === 0) return null;
if (typeof d.at !== 'number') return null;
return d as SocialRelationshipInvalidationEvent;
    },
timestampField: 'at',
  },
);

export function closeSocialRelationshipChannel(): void {
socialRelationshipChannel.closeChannel();
}

export function subscribeSocialRelationshipInvalidation(
handler: (event: SocialRelationshipInvalidationEvent) => void,
): () => void {
return socialRelationshipChannel.subscribe(handler);
}

export function publishSocialRelationshipInvalidation(
payload: SocialRelationshipInvalidationPayload,
): void {

socialRelationshipChannel.ensureChannel();
if (!payload.userId || typeof payload.userId !== 'string') {

return;
  }
if (!SOCIAL_RELATIONSHIP_VALID_KINDS.has(payload.kind)) {
return;
  }
socialRelationshipChannel.publish({
kind: payload.kind,
userId: payload.userId,
  });
}
