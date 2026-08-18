

export type AttemptResponseDtoStatus = typeof AttemptResponseDtoStatus[keyof typeof AttemptResponseDtoStatus];

export const AttemptResponseDtoStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
