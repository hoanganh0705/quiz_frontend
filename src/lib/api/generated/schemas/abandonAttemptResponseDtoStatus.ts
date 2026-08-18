

export type AbandonAttemptResponseDtoStatus = typeof AbandonAttemptResponseDtoStatus[keyof typeof AbandonAttemptResponseDtoStatus];

export const AbandonAttemptResponseDtoStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
