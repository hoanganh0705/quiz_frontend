

export type QuizHistoryEntryDtoStatus = typeof QuizHistoryEntryDtoStatus[keyof typeof QuizHistoryEntryDtoStatus];

export const QuizHistoryEntryDtoStatus = {
passed: 'passed',
failed: 'failed',
abandoned: 'abandoned',
in_progress: 'in_progress',
} as const;
