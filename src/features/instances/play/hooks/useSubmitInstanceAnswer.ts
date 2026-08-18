"use client";

import { useCallback, useRef, useState } from "react";

import { ApiError, isApiError } from "@/lib/api";
import { getFeatureFlagValue } from "@/lib/feature-flags";

import {
type AnswerSubmissionDto,
type GameplayWsErrorCode,
type QuestionTimingDto,
type AnswerSubmissionState,
} from "../types/gameplay.types";
import { useInstanceGameSocket } from "./useInstanceGameSocket";
import {
useInstanceGameplayStore,
selectGameplayTiming,
selectGameplaySubmission,
} from "../stores/instanceGameplay.store";

export interface UseSubmitInstanceAnswerResult {

submit: (optionId: string) => Promise<void>;

state: AnswerSubmissionState;

lastError: ApiError | null;

submission: { questionId: string; submittedAt: string; accepted: boolean } | null;

canSubmit: boolean;

reset: () => void;
}

function isTimingWindowOpen(timing: QuestionTimingDto | null, serverTimeMs: number): boolean {
if (!timing) return false;
const startMs = new Date(timing.startsAt).getTime();
const endMs = startMs + timing.durationMs;
return serverTimeMs >= startMs && serverTimeMs < endMs;
}

export function useSubmitInstanceAnswer(
instanceId: string | null,
currentQuestionId: string | null,
): UseSubmitInstanceAnswerResult {
const flagValue = getFeatureFlagValue("multiplayer_play_live");
const isPlaceholder = flagValue === "placeholder";

const { emitAnswer, connectionState } = useInstanceGameSocket(instanceId);

const timing = useInstanceGameplayStore((s) =>
instanceId ? selectGameplayTiming(s, instanceId) : null,
  );

const serverTimeMs = timing
? new Date(timing.serverNow).getTime()
: 0;
const windowOpen = isTimingWindowOpen(timing, serverTimeMs);

const [state, setState] = useState<AnswerSubmissionState>("idle");
const [lastError, setLastError] = useState<ApiError | null>(null);
const [acceptedAck, setAcceptedAck] = useState<{
questionId: string;
submittedAt: string;
accepted: boolean;
  } | null>(null);

const pendingRef = useRef(false);

const submittedQuestionRef = useRef<string | null>(null);

const canSubmit =
!isPlaceholder &&
currentQuestionId !== null &&
windowOpen &&
connectionState === "connected" &&
submittedQuestionRef.current !== currentQuestionId &&
!pendingRef.current;

const submit = useCallback(
async (optionId: string): Promise<void> => {
if (isPlaceholder || currentQuestionId === null) return;
if (pendingRef.current) return;
if (submittedQuestionRef.current === currentQuestionId) return;

pendingRef.current = true;
setState("pending");
setLastError(null);

const submission: AnswerSubmissionDto = {
questionId: currentQuestionId,
optionId,
submittedAt: new Date().toISOString(),
clientToken: crypto.randomUUID(),
      };

try {
const ack = await emitAnswer(submission);

submittedQuestionRef.current = currentQuestionId;
setAcceptedAck({
questionId: ack.questionId,
submittedAt: ack.submittedAt,
accepted: ack.accepted,
        });
setState("accepted");
setLastError(null);

useInstanceGameplayStore.getState().applySubmission(
ack.questionId,
ack.submittedAt,
        );
      } catch (cause: unknown) {
pendingRef.current = false;
setState("rejected");

if (isApiError(cause)) {
setLastError(cause as ApiError);
        } else {
setLastError(
new ApiError({
status: 0,
code: "UNKNOWN",
message: "Submission failed",
            } as unknown as ConstructorParameters<typeof ApiError>[0]),
          );
        }
      } finally {
pendingRef.current = false;
      }
    },

[isPlaceholder, currentQuestionId, emitAnswer, windowOpen, connectionState],
  );

const reset = useCallback((): void => {
if (submittedQuestionRef.current !== currentQuestionId) return;
submittedQuestionRef.current = null;
setState("idle");
setLastError(null);
setAcceptedAck(null);
  }, [currentQuestionId]);

if (isPlaceholder) {
return {
submit: async () => {},
state: "idle",
lastError: null,
submission: null,
canSubmit: false,
reset: () => {},
    };
  }

return {
submit,
state,
lastError,
submission: acceptedAck,
canSubmit,
reset,
  };
}
