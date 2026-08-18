

export type VoteDtoValue = typeof VoteDtoValue[keyof typeof VoteDtoValue];

export const VoteDtoValue = {
upvote: 'upvote',
downvote: 'downvote',
} as const;
