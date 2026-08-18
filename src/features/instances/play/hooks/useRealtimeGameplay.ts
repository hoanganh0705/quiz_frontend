"use client";

import { useCallback, useEffect, useRef } from "react";

import {
type AnswerResultDto,
type FinalLeaderboardDto,
type GameplayEventEnvelope,
type InstanceClosedEventDto,
type LeaderboardEntryDto,
type LeaderboardUpdatedEventDto,
type PlayerQuestionBundleDto,
type PlayerProgressDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import { useReconnectReconciliation } from "./useReconnectReconciliation";
import {
useInstanceGameplayStore,
selectGameplayBundle,
selectGameplayTiming,
selectGameplaySubmission,
selectGameplayResult,
selectGameplayProgress,
selectGameplayLeaderboard,
selectGameplayClosure,
selectGameplayFinalLeaderboard,
selectGameplayIsReconciling,
} from "../stores/instanceGameplay.store";

export interface UseRealtimeGameplayResult {

bundle: PlayerQuestionBundleDto | null;

timing: ReturnType<typeof selectGameplayTiming>;

submission: ReturnType<typeof selectGameplaySubmission>;

result: AnswerResultDto | null;

progress: PlayerProgressDto | null;

leaderboard: LeaderboardEntryDto[];

closure: InstanceClosedEventDto | null;

finalLeaderboard: FinalLeaderboardDto | null;

isReconciling: boolean;
}

export function useRealtimeGameplay(
instanceId: string | null,
): UseRealtimeGameplayResult {
const { subscribe } = useInstanceGameSocket(instanceId);
const { shouldAccept, markAccepted } = useSocketEventSequence(instanceId);
const { isReconciling } = useReconnectReconciliation(instanceId);
const {
applyQuestionRevealed,
applyAnswerResult,
applyLeaderboardUpdated,
applyInstanceClosed,
applyFinalLeaderboard,
applyPlayerProgress,
  } = useInstanceGameplayStore.getState();

const gatedRef = useRef(false);
gatedRef.current = isReconciling;

const handleEnvelope = useCallback(
(envelope: GameplayEventEnvelope<unknown>) => {

if (gatedRef.current) return;

switch (envelope.event) {
case "question_revealed": {
const typed = envelope as GameplayEventEnvelope<PlayerQuestionBundleDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
applyQuestionRevealed(typed);
break;
        }
case "answer_result": {
const typed = envelope as GameplayEventEnvelope<AnswerResultDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
applyAnswerResult(typed);
break;
        }
case "leaderboard_updated": {
const typed = envelope as GameplayEventEnvelope<LeaderboardUpdatedEventDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
applyLeaderboardUpdated(typed);
break;
        }
case "instance_closed": {
const typed = envelope as GameplayEventEnvelope<InstanceClosedEventDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
applyInstanceClosed(typed);
break;
        }
case "instance_final_leaderboard": {
const typed = envelope as GameplayEventEnvelope<FinalLeaderboardDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
applyFinalLeaderboard(typed);
break;
        }
default:
break;
      }
    },
[
shouldAccept,
markAccepted,
applyQuestionRevealed,
applyAnswerResult,
applyLeaderboardUpdated,
applyInstanceClosed,
applyFinalLeaderboard,
    ],
  );

useEffect(() => {
if (instanceId === null) return;
return subscribe(handleEnvelope);
  }, [instanceId, subscribe, handleEnvelope]);

const bundle = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayBundle(s, instanceId) : null,
  );
const timing = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayTiming(s, instanceId) : null,
  );
const submission = useInstanceGameplayStore((s) =>
instanceId ? selectGameplaySubmission(s, instanceId) : null,
  );
const result = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayResult(s, instanceId) : null,
  );
const progress = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayProgress(s, instanceId) : null,
  );
const leaderboard = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayLeaderboard(s, instanceId) : [],
  );
const closure = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayClosure(s, instanceId) : null,
  );
const finalLeaderboard = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );
const reconciling = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayIsReconciling(s, instanceId) : false,
  );

return {
bundle,
timing,
submission,
result,
progress,
leaderboard,
closure,
finalLeaderboard,
isReconciling: reconciling,
  };
}
