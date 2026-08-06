// Gameplay hooks — Story 5.8 batch B

export {
  useInstancesPlayFeatureFlag,
  type UseInstancesPlayFeatureFlagResult,
} from './useInstancesPlayFeatureFlag';

export {
  useSocketEventSequence,
  applyWithSequence,
  type UseSocketEventSequenceResult,
} from './useSocketEventSequence';

export {
  useInstanceGameSocket,
  GAMEPLAY_PAYLOAD_VERSION,
  type UseInstanceGameSocketResult,
} from './useInstanceGameSocket';

export {
  useQuestionRevealed,
  type UseQuestionRevealedResult,
} from './useQuestionRevealed';

export {
  useSubmitInstanceAnswer,
  type UseSubmitInstanceAnswerResult,
} from './useSubmitInstanceAnswer';

export {
  useQuestionTimer,
  type UseQuestionTimerResult,
} from './useQuestionTimer';

export {
  useLiveLeaderboard,
  type UseLiveLeaderboardResult,
} from './useLiveLeaderboard';

export {
  useInstanceLifecycle,
  type UseInstanceLifecycleResult,
} from './useInstanceLifecycle';

export {
  useReconnectReconciliation,
  type UseReconnectReconciliationResult,
} from './useReconnectReconciliation';

export {
  useRealtimeGameplay,
  type UseRealtimeGameplayResult,
} from './useRealtimeGameplay';
