

export type CommentWithRepliesDtoUserVote = typeof CommentWithRepliesDtoUserVote[keyof typeof CommentWithRepliesDtoUserVote] | null;

export const CommentWithRepliesDtoUserVote = {
upvote: 'upvote',
downvote: 'downvote',
} as const;
