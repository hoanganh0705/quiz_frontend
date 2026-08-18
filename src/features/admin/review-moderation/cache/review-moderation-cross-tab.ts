

import { createBroadcastChannel } from '@/lib/broadcast';

import {
invalidateReviewById,
invalidateReviewReportsList,
} from './review-moderation-cache-keys';

export const REVIEW_MODERATION_CHANNEL_NAME =
'phase7-admin-review-moderation' as const;

export type ReviewModerationEventType =
'admin:7.1.review-moderation.invalidate';

export type ReviewModerationMutation = 'resolve';

const REVIEW_MODERATION_VALID_MUTATIONS = new Set<ReviewModerationMutation>([
'resolve',
]);

export interface BaseReviewModerationEvent {
type: ReviewModerationEventType;

tabId: string;

timestamp: number;

action: ReviewModerationMutation;

reportId: string;

reviewId: string | null;
}

export interface ReviewModerationInvalidatedEvent
extends BaseReviewModerationEvent {
type: 'admin:7.1.review-moderation.invalidate';
}

export type ReviewModerationEvent = ReviewModerationInvalidatedEvent;

const reviewModerationChannel = createBroadcastChannel<ReviewModerationEvent>(
REVIEW_MODERATION_CHANNEL_NAME,
{
validate: (data): ReviewModerationEvent | null => {
if (typeof data !== 'object' || data === null) return null;
const d = data as Partial<ReviewModerationInvalidatedEvent>;
if (d.type !== 'admin:7.1.review-moderation.invalidate') return null;
if (typeof d.tabId !== 'string' || d.tabId.length === 0) return null;
if (typeof d.timestamp !== 'number') return null;
if (
typeof d.action !== 'string' ||
!REVIEW_MODERATION_VALID_MUTATIONS.has(d.action as ReviewModerationMutation)
      ) {
return null;
      }
if (typeof d.reportId !== 'string' || d.reportId.length === 0) return null;

if (d.reviewId !== null && typeof d.reviewId !== 'string') return null;
return d as ReviewModerationEvent;
    },
  },
);

export function getReviewModerationChannel(): BroadcastChannel | null {
return reviewModerationChannel.getChannel();
}

export function initReviewModerationChannel(): BroadcastChannel | null {
return reviewModerationChannel.ensureChannel();
}

export function closeReviewModerationChannel(): void {
reviewModerationChannel.closeChannel();
}

export function subscribeReviewModerationInvalidate(
handler: (event: ReviewModerationEvent) => void,
): () => void {
return reviewModerationChannel.subscribe(handler);
}

export function broadcastReviewModerationInvalidate(
action: ReviewModerationMutation,
reportId: string,
reviewId: string | null,
): void {
if (!reportId || typeof reportId !== 'string') {

return;
  }
if (!REVIEW_MODERATION_VALID_MUTATIONS.has(action)) return;
reviewModerationChannel.publish({
type: 'admin:7.1.review-moderation.invalidate',
action,
reportId,
reviewId,
  });
}
