

export type QuizHistoryControllerListMyQuizHistoryStatus = typeof QuizHistoryControllerListMyQuizHistoryStatus[keyof typeof QuizHistoryControllerListMyQuizHistoryStatus] | null;

export const QuizHistoryControllerListMyQuizHistoryStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
