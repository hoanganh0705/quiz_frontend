// Attempts feature - public API surface
export * from './services'
export * from './types'
// T-4.5.B8
export { useMyAttempts } from './hooks/useMyAttempts';
export type {
  UseMyAttemptsParams,
  UseMyAttemptsResult,
  AttemptSummary,
} from './hooks/useMyAttempts';

// Story 4.14 Batch 5 — runner orchestration hook.
export {
  useAttemptRunner,
  type AttemptRunnerNavigation,
  type UseAttemptRunnerParams,
  type UseAttemptRunnerResult,
} from './hooks/useAttemptRunner';

// Story 4.14 Batch 5 — page container.
export { AttemptRunnerPage } from './components/AttemptRunnerPage';
export type { AttemptRunnerPageProps } from './components/AttemptRunnerPage';

// Story 4.15 Batch 5 — quiz history page composition.
export {
  QuizHistoryRow,
  type QuizHistoryRowProps,
} from './components/QuizHistoryRow';
export {
  QuizHistoryFilterBar,
  type QuizHistoryFilterBarProps,
} from './components/QuizHistoryFilterBar';
export {
  QuizHistoryList,
  type QuizHistoryListProps,
} from './components/QuizHistoryList';
export {
  QuizHistoryPage,
  type QuizHistoryPageProps,
} from './components/QuizHistoryPage';

// Story 4.15 Batch 6 — attempt detail page.
export {
  AttemptDetailPage,
  type AttemptDetailPageProps,
} from './components/AttemptDetailPage';