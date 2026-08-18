

export type AttemptControllerListMyAttemptsStatus = typeof AttemptControllerListMyAttemptsStatus[keyof typeof AttemptControllerListMyAttemptsStatus] | null;

export const AttemptControllerListMyAttemptsStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
