

export type AttemptControllerListMyAttemptsSortBy = typeof AttemptControllerListMyAttemptsSortBy[keyof typeof AttemptControllerListMyAttemptsSortBy] | null;

export const AttemptControllerListMyAttemptsSortBy = {
createdAt: 'createdAt',
completedAt: 'completedAt',
score: 'score',
} as const;
