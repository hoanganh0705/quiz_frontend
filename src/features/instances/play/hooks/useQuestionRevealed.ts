"use client";

import { useCallback, useEffect } from "react";

import {
type GameplayEventEnvelope,
type PlayerQuestionBundleDto,
type QuestionTimingDto,
} from "../types/gameplay.types";
import {
useInstanceGameSocket,
} from "./useInstanceGameSocket";
import { useSocketEventSequence } from "./useSocketEventSequence";
import {
useInstanceGameplayStore,
selectGameplayBundle,
selectGameplayTiming,
} from "../stores/instanceGameplay.store";

export interface UseQuestionRevealedResult {

bundle: PlayerQuestionBundleDto | null;

timing: QuestionTimingDto | null;

hasRevealed: boolean;

isStale: boolean;
}

export function useQuestionRevealed(
instanceId: string | null,
): UseQuestionRevealedResult {
const { subscribe } = useInstanceGameSocket(instanceId);
const { shouldAccept, markAccepted, lastAcceptedSequence } = useSocketEventSequence(instanceId);
const { applyQuestionRevealed } = useInstanceGameplayStore.getState();

const displayedSeqRef = { current: 0 };

const handleEnvelope = useCallback(
(envelope: GameplayEventEnvelope<unknown>) => {
if (envelope.event !== "question_revealed") return;
const typed = envelope as GameplayEventEnvelope<PlayerQuestionBundleDto>;

if (!shouldAccept(typed.event, typed.eventSequence)) return;

markAccepted(typed.event, typed.eventSequence);
displayedSeqRef.current = typed.eventSequence;
applyQuestionRevealed(typed);
    },
[shouldAccept, markAccepted, applyQuestionRevealed],
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

const hasRevealed = bundle !== null;

const isStale =
displayedSeqRef.current > 0 &&
lastAcceptedSequence("question_revealed") > displayedSeqRef.current;

return {
bundle,
timing,
hasRevealed,
isStale,
  };
}
