"use client";

/**
 * `useSubmitInstanceAnswer` — idempotent answer submission mutation hook.
 *
 * Source epic:   Phase 5 — Realtime, Tournaments, Multiplayer.
 * Source story:  5.8 — Realtime multiplayer question play and post-game
 *                leaderboard.
 * Source ticket: TKT-5.8.B3.
 *
 * ## What this hook owns
 *
 * - Emit answer submissions through `useInstanceGameSocket.emitAnswer`.
 * - Enforce one-submission-per-question in the UI: `pending` blocks a
 *   second `submit` call.
 * - Surface typed WS error codes (`DUPLICATE_ANSWER`,
 *   `ANSWER_WINDOW_CLOSED`, `INVALID_OPTION`, `NOT_PARTICIPANT`,
 *   `AUTH_REQUIRED`, `MALFORMED_EVENT`, `TIMEOUT`, `DISCONNECT`,
 *   `UNKNOWN`).
 * - Return authoritative acknowledgement state (`accepted` / `rejected`).
 * - Expose `canSubmit` — gated by the server-provided timing window,
 *   the socket connection state, the current question, and the feature flag.
 * - Never bypass the server's answer window or infer acceptance from
 *   local timers.
 * - Never blindly retry after failure.
 *
 * ## Submission contract
 *
 * The server is the sole authority on whether the answer window is open.
 * `canSubmit` uses the server-provided `timing` from `useQuestionRevealed`
 * (or the store timing). The client tick is used only for display — it
 * never unblocks `canSubmit`.
 *
 * ## Feature flag
 *
 * Returns safe fallbacks when `phase5_instances_play === 'placeholder'`.
 */

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

// ─── Result type ─────────────────────────────────────────────────────────

export interface UseSubmitInstanceAnswerResult {
  /**
   * Submit an answer for the current question. Idempotent — pending state
   * blocks a second call. Throws `ApiError<GameplayWsErrorCode>` on failure.
   */
  submit: (optionId: string) => Promise<void>;
  /** Current submission state machine value. */
  state: AnswerSubmissionState;
  /** Typed error from the last failed submission. `null` when idle or accepted. */
  lastError: ApiError | null;
  /** Accepted acknowledgement. `null` when not yet accepted. */
  submission: { questionId: string; submittedAt: string; accepted: boolean } | null;
  /**
   * `true` when the server-provided timing window is open AND the socket
   * is connected AND no accepted submission exists for the current question.
   * Always `false` when the feature flag is `'placeholder'`.
   */
  canSubmit: boolean;
  /** Reset the state machine to `idle`. Used when a new question is revealed. */
  reset: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

/**
 * Check whether the server-provided timing window is currently open.
 * The client tick is used only for display — this function computes only
 * the server-authoritative window state.
 *
 * @param timing - The server-provided timing contract.
 * @param serverTimeMs - The server's `Date.now()` equivalent at the time
 *   of the last envelope (recomputed from `timing.serverNow` + drift).
 */
function isTimingWindowOpen(timing: QuestionTimingDto | null, serverTimeMs: number): boolean {
  if (!timing) return false;
  const startMs = new Date(timing.startsAt).getTime();
  const endMs = startMs + timing.durationMs;
  return serverTimeMs >= startMs && serverTimeMs < endMs;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useSubmitInstanceAnswer(
  instanceId: string | null,
  currentQuestionId: string | null,
): UseSubmitInstanceAnswerResult {
  const flagValue = getFeatureFlagValue("phase5_instances_play");
  const isPlaceholder = flagValue === "placeholder";

  const { emitAnswer, connectionState } = useInstanceGameSocket(instanceId);

  // ─── Timing check ─────────────────────────────────────────────────────
  //
  // Recompute server time from the latest timing envelope. The client
  // drift is recomputed on every timing change.

  const timing = useInstanceGameplayStore((s) =>
    instanceId ? selectGameplayTiming(s, instanceId) : null,
  );

  // Compute the effective server time: server's reported "now" is the
  // source of truth for the window boundary.
  const serverTimeMs = timing
    ? new Date(timing.serverNow).getTime()
    : 0;
  const windowOpen = isTimingWindowOpen(timing, serverTimeMs);

  // ─── Submission state machine ─────────────────────────────────────────

  const [state, setState] = useState<AnswerSubmissionState>("idle");
  const [lastError, setLastError] = useState<ApiError | null>(null);
  const [acceptedAck, setAcceptedAck] = useState<{
    questionId: string;
    submittedAt: string;
    accepted: boolean;
  } | null>(null);

  // Guard against concurrent submissions.
  const pendingRef = useRef(false);

  // Guard against submitting for a different question than what we've
  // already submitted for.
  const submittedQuestionRef = useRef<string | null>(null);

  // ─── canSubmit ────────────────────────────────────────────────────────

  const canSubmit =
    !isPlaceholder &&
    currentQuestionId !== null &&
    windowOpen &&
    connectionState === "connected" &&
    submittedQuestionRef.current !== currentQuestionId &&
    !pendingRef.current;

  // ─── submit ──────────────────────────────────────────────────────────

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

        // Also record in the gameplay store.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isPlaceholder, currentQuestionId, emitAnswer, windowOpen, connectionState],
  );

  // ─── reset ────────────────────────────────────────────────────────────
  //
  // Called when a new question is revealed so the player can submit again.

  const reset = useCallback((): void => {
    if (submittedQuestionRef.current !== currentQuestionId) return;
    submittedQuestionRef.current = null;
    setState("idle");
    setLastError(null);
    setAcceptedAck(null);
  }, [currentQuestionId]);

  // ─── Fallback when placeholder ─────────────────────────────────────────

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
