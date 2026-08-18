"use client";

import { useCallback, useEffect, useRef } from "react";

import {
type AnswerResultDto,
type FinalLeaderboardDto,
type GameplayEventEnvelope,
type InstanceClosedEventDto,
type PlayerProgressDto,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
useInstanceGameplayStore,
selectGameplayClosure,
selectGameplayResult,
selectGameplayFinalLeaderboard,
} from "../stores/instanceGameplay.store";

export interface UseInstanceLifecycleResult {

isClosed: boolean;

closure: InstanceClosedEventDto | null;

finalLeaderboard: FinalLeaderboardDto | null;

lastResult: AnswerResultDto | null;

isStale: boolean;
}

export function useInstanceLifecycle(
instanceId: string | null,
): UseInstanceLifecycleResult {
const { subscribe } = useInstanceGameSocket(instanceId);
const { shouldAccept, markAccepted, lastAcceptedSequence } = useSocketEventSequence(instanceId);
const {
applyAnswerResult,
applyInstanceClosed,
applyFinalLeaderboard,
  } = useInstanceGameplayStore.getState();

const displayedResultSeqRef = { current: 0 };

const handleEnvelope = useCallback(
(envelope: GameplayEventEnvelope<unknown>) => {
switch (envelope.event) {
case "answer_result": {
const typed = envelope as GameplayEventEnvelope<AnswerResultDto>;
if (!shouldAccept(typed.event, typed.eventSequence)) return;
markAccepted(typed.event, typed.eventSequence);
displayedResultSeqRef.current = typed.eventSequence;
applyAnswerResult(typed);
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

case "leaderboard_updated": {
const typed = envelope as GameplayEventEnvelope<PlayerProgressDto[]>;

break;
        }
default:
break;
      }
    },
[shouldAccept, markAccepted, applyAnswerResult, applyInstanceClosed, applyFinalLeaderboard],
  );

useEffect(() => {
if (instanceId === null) return;
return subscribe(handleEnvelope);
  }, [instanceId, subscribe, handleEnvelope]);

const closure = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayClosure(s, instanceId) : null,
  );
const lastResult = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayResult(s, instanceId) : null,
  );
const finalLeaderboard = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayFinalLeaderboard(s, instanceId) : null,
  );

const isClosed = closure !== null;

const isStale =
displayedResultSeqRef.current > 0 &&
lastAcceptedSequence("answer_result") > displayedResultSeqRef.current;

return {
isClosed,
closure,
finalLeaderboard,
lastResult,
isStale,
  };
}
