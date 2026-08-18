

export type CompleteAttemptResponseDtoStatus = typeof CompleteAttemptResponseDtoStatus[keyof typeof CompleteAttemptResponseDtoStatus];

export const CompleteAttemptResponseDtoStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
