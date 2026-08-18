

import type {
CommentDto,
CommentWithRepliesDto,
} from '@/lib/api/generated/schemas';

export const REPLY_CAP = 100;

export const TOP_LEVEL_DEFAULT_LIMIT = 20;

export const REPLY_DEFAULT_LIMIT = 50;

export function commentsKey(
quizId: string,
filters?: CommentFilters,
): ['comments', string, ReadonlyArray<string | number | undefined>] {
return [
'comments',
quizId,
[
filters?.parentId ?? undefined,
filters?.cursor ?? undefined,
filters?.limit ?? undefined,
    ],
  ];
}

export function commentThreadKey(quizId: string): ['comments', 'thread', string] {
return ['comments', 'thread', quizId];
}

export interface CommentFilters {
cursor?: string;
limit?: number;
parentId?: string;
}

export type CommentItem = CommentDto & { id: string };

export type CommentThreadItem = CommentWithRepliesDto & { id: string };

export type CommentVoteDirection = 'upvote' | 'downvote';

export type CommentUserVote = CommentVoteDirection | null;

export interface ThreadLookupEntry {

repliesCount: number;

replyCap: number;
}
