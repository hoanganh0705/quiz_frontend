

import { createBroadcastChannel } from '@/lib/broadcast';

import {
invalidateCommentById,
invalidateCommentReportsList,
} from './comment-moderation-cache-keys';

export const COMMENT_MODERATION_CHANNEL_NAME =
'phase7-admin-comment-moderation' as const;

export type CommentModerationEventType =
'admin:7.1.comment-moderation.invalidate';

export type CommentModerationMutation = 'resolve' | 'hide' | 'restore';

const COMMENT_MODERATION_VALID_MUTATIONS = new Set<CommentModerationMutation>([
'resolve',
'hide',
'restore',
]);

export interface BaseCommentModerationEvent {
type: CommentModerationEventType;

tabId: string;

timestamp: number;

action: CommentModerationMutation;

reportId: string | null;

commentId: string;
}

export interface CommentModerationInvalidatedEvent
extends BaseCommentModerationEvent {
type: 'admin:7.1.comment-moderation.invalidate';
}

export type CommentModerationEvent = CommentModerationInvalidatedEvent;

const commentModerationChannel = createBroadcastChannel<CommentModerationEvent>(
COMMENT_MODERATION_CHANNEL_NAME,
{
validate: (data): CommentModerationEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<CommentModerationInvalidatedEvent>;
if (d.type !== 'admin:7.1.comment-moderation.invalidate') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.timestamp !== 'number') return null;
if (
typeof d.action !== 'string' ||
!COMMENT_MODERATION_VALID_MUTATIONS.has(d.action as CommentModerationMutation)
      ) {
return null;
      }
if (typeof d.commentId !== 'string' || d.commentId.length === 0) {
return null;
      }

if (d.reportId !== null && typeof d.reportId !== 'string') return null;
return d as CommentModerationEvent;
    },
  },
);

export function getCommentModerationChannel(): BroadcastChannel | null {
return commentModerationChannel.getChannel();
}

export function initCommentModerationChannel(): BroadcastChannel | null {
return commentModerationChannel.ensureChannel();
}

export function closeCommentModerationChannel(): void {
commentModerationChannel.closeChannel();
}

export function subscribeCommentModerationInvalidate(
handler: (event: CommentModerationEvent) => void,
): () => void {
return commentModerationChannel.subscribe(handler);
}

export function broadcastCommentModerationInvalidate(
action: CommentModerationMutation,
reportId: string | undefined,
commentId: string,
): void {
if (!commentId || typeof commentId !== 'string') {

return;
  }
if (!COMMENT_MODERATION_VALID_MUTATIONS.has(action)) return;
commentModerationChannel.publish({
type: 'admin:7.1.comment-moderation.invalidate',
action,
reportId:
typeof reportId === 'string' && reportId.length > 0 ? reportId : null,
commentId,
  });
}
