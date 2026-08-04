// Attempts hooks barrel — Story 4.14 read + mutation hooks.

export {
  useActiveAttempt,
  type UseActiveAttemptParams,
  type ActiveAttemptView,
} from './useActiveAttempt';

export {
  useAttemptHydration,
  buildSubmittedAnswersMap,
  type UseAttemptHydrationParams,
  type AttemptHydrationView,
} from './useAttemptHydration';

export {
  useAttemptCrossTabSync,
  type UseAttemptCrossTabSyncParams,
} from './useAttemptCrossTabSync';

export {
  useStartAttempt,
  type UseStartAttemptParams,
  type UseStartAttemptResult,
  type StartAttemptOutcome,
} from './useStartAttempt';

export {
  useSubmitAnswer,
  type UseSubmitAnswerParams,
  type UseSubmitAnswerResult,
  type SubmitAnswerOutcome,
} from './useSubmitAnswer';

export {
  useDeleteAnswer,
  type UseDeleteAnswerParams,
  type UseDeleteAnswerResult,
  type DeleteAnswerOutcome,
} from './useDeleteAnswer';

export {
  useAbandonAttempt,
  type UseAbandonAttemptParams,
  type UseAbandonAttemptResult,
  type AbandonAttemptOutcome,
} from './useAbandonAttempt';

export {
  useAttemptRunner,
  type UseAttemptRunnerParams,
  type UseAttemptRunnerResult,
  type AttemptRunnerNavigation,
} from './useAttemptRunner';