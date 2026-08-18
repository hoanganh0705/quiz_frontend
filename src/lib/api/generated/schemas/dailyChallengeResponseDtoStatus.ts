

export type DailyChallengeResponseDtoStatus = typeof DailyChallengeResponseDtoStatus[keyof typeof DailyChallengeResponseDtoStatus];

export const DailyChallengeResponseDtoStatus = {
pending: 'pending',
completed: 'completed',
expired: 'expired',
} as const;
