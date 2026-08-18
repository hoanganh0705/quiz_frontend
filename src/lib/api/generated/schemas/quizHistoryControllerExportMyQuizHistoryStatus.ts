

export type QuizHistoryControllerExportMyQuizHistoryStatus = typeof QuizHistoryControllerExportMyQuizHistoryStatus[keyof typeof QuizHistoryControllerExportMyQuizHistoryStatus] | null;

export const QuizHistoryControllerExportMyQuizHistoryStatus = {
started: 'started',
completed: 'completed',
abandoned: 'abandoned',
} as const;
