import * as React from "react";

import { ApiError } from "@/lib/api";

import { deriveQuestionKind } from "@/features/attempts/lib/attempt-answer-validation";
import { useAttemptHydration } from "@/features/attempts/hooks/useAttemptHydration";
import { useActiveAttempt } from "@/features/attempts/hooks/useActiveAttempt";
import { useAttemptCrossTabSync } from "@/features/attempts/hooks/useAttemptCrossTabSync";
import { useStartAttempt } from "@/features/attempts/hooks/useStartAttempt";
import { useSubmitAnswer } from "@/features/attempts/hooks/useSubmitAnswer";
import { useCompleteAttempt } from "@/features/attempts/hooks/useCompleteAttempt";
import { useDeleteAnswer } from "@/features/attempts/hooks/useDeleteAnswer";
import { useAbandonAttempt } from "@/features/attempts/hooks/useAbandonAttempt";
import {
  type AnswerSelection,
  type AttemptRunnerStatus,
  type SubmittedAnswersMap,
  statusFromAttempt,
  statusFromAttemptSummary,
} from "@/features/attempts/types/attempt-runner.types";
import {
  hydrateAttemptEntry,
  recordCompletionSuccess,
  resetAttempt,
  setDraftSelection,
  useAttemptSubmittedAnswers,
} from "@/features/attempts/stores/useAttemptsStore";

import { useAuthSessionId } from "@/features/auth/hooks/use-auth-session-id";

import type {
  AttemptSummaryResponseDto,
  QuizQuestionPlayerDto,
} from "@/lib/api/generated/schemas";

export type AttemptRunnerNavigation =
  | { kind: "push_attempt"; href: string }
  | { kind: "push_quiz"; href: string }
  | { kind: "replace_login"; href: string };

export interface UseAttemptRunnerParams {
  quizId: string | null;

  quizVersionId: string | null;

  idOrSlug: string | null;

  questions: readonly QuizQuestionPlayerDto[] | null;
}

export interface UseAttemptRunnerResult {
  status: AttemptRunnerStatus;

  activeAttempt: AttemptSummaryResponseDto | null;

  attemptId: string | null;

  isActiveLoading: boolean;

  hasHydrated: boolean;

  submittedAnswers: SubmittedAnswersMap;

  navigation: AttemptRunnerNavigation | null;

  error: ApiError | null;

  currentIndex: number;

  totalQuestions: number;

  questions: readonly QuizQuestionPlayerDto[];

  drafts: Record<string, AnswerSelection>;

  updateDraft: (selection: AnswerSelection) => void;

  submitAnswer: (
    question: QuizQuestionPlayerDto,
    selection: AnswerSelection,
  ) => void;

  selectAnswer: (
    question: QuizQuestionPlayerDto,
    selection: AnswerSelection,
  ) => void;

  completeQuiz: () => Promise<void>;

  start: () => Promise<void>;

  abandon: () => Promise<void>;

  consumeNavigation: () => void;
}

export function useAttemptRunner(
  params: UseAttemptRunnerParams,
): UseAttemptRunnerResult {
  const { quizId, quizVersionId, idOrSlug, questions } = params;

  const sessionId = useAuthSessionId();

  const {
    attempt: activeAttempt,
    isLoading: isActiveLoading,
    retry: retryActive,
  } = useActiveAttempt({ quizId });

  const [attemptId, setAttemptId] = React.useState<string | null>(
    activeAttempt?.attemptId ?? null,
  );
  React.useEffect(() => {
    if (activeAttempt?.attemptId && activeAttempt.attemptId !== attemptId) {
      setAttemptId(activeAttempt.attemptId);
    }
  }, [activeAttempt?.attemptId, attemptId]);

  const hydration = useAttemptHydration({ attemptId });
  const storeSubmittedAnswers = useAttemptSubmittedAnswers(attemptId);
  const submittedAnswers: SubmittedAnswersMap = React.useMemo(() => {
    return {
      ...hydration.submittedAnswers,
      ...storeSubmittedAnswers,
    };
  }, [hydration.submittedAnswers, storeSubmittedAnswers]);

  const wireStatus: AttemptRunnerStatus | null = React.useMemo(() => {
    if (hydration.detail) return statusFromAttempt(hydration.detail.status);
    if (activeAttempt) return statusFromAttemptSummary(activeAttempt);
    return null;
  }, [hydration.detail, activeAttempt]);

  const [overlayStatus, setOverlayStatus] =
    React.useState<AttemptRunnerStatus>("idle");

  const status: AttemptRunnerStatus = React.useMemo(() => {
    if (
      overlayStatus === "starting" ||
      overlayStatus === "submitting" ||
      overlayStatus === "abandoning" ||
      overlayStatus === "completing"
    ) {
      return overlayStatus;
    }
    return wireStatus ?? overlayStatus;
  }, [overlayStatus, wireStatus]);

  useAttemptCrossTabSync({ quizVersionId, quizId });

  React.useEffect(() => {
    if (attemptId === null || quizId === null || sessionId === null) return;
    const detail = hydration.detail;
    if (!detail) return;
    const next = statusFromAttempt(detail.status);
    hydrateAttemptEntry(attemptId, quizId, sessionId, {
      status: next,
    });
  }, [attemptId, quizId, sessionId, hydration.detail]);

  const [navigation, setNavigation] =
    React.useState<AttemptRunnerNavigation | null>(null);
  const consumeNavigation = React.useCallback(() => {
    setNavigation(null);
  }, []);

  const [drafts, setDrafts] = React.useState<Record<string, AnswerSelection>>(
    {},
  );
  const draftsRef = React.useRef<Record<string, AnswerSelection>>({});

  React.useEffect(() => {
    if (!questions || Object.keys(hydration.submittedAnswers).length === 0)
      return;
    setDrafts((prev) => {
      let changed = false;
      const next = { ...prev };
      for (const q of questions) {
        const sub = hydration.submittedAnswers[q.questionId];
        if (sub && sub.selectedOptionId && !next[q.questionId]) {
          const kind = deriveQuestionKind(q);
          if (kind === "true_false") {
            const matchedOption = q.answerOptions.find(
              (o) => o.optionId === sub.selectedOptionId,
            );
            const normalizedVal = matchedOption?.value?.toLowerCase();
            if (normalizedVal === "true" || normalizedVal === "false") {
              next[q.questionId] = {
                kind: "true_false",
                questionId: q.questionId,
                value: normalizedVal === "true",
              };
              changed = true;
            }
          } else {
            next[q.questionId] = {
              kind: "multiple_choice",
              questionId: q.questionId,
              selectedOptionIds: [sub.selectedOptionId],
            };
            changed = true;
          }
        }
      }
      if (changed) {
        draftsRef.current = next;
        return next;
      }
      return prev;
    });
  }, [questions, hydration.submittedAnswers]);

  const updateDraft = React.useCallback(
    (selection: AnswerSelection) => {
      if (attemptId === null || quizVersionId === null || sessionId === null) {
        return;
      }

      const newDrafts = {
        ...draftsRef.current,
        [selection.questionId]: selection,
      };
      draftsRef.current = newDrafts;
      setDrafts(newDrafts);

      setDraftSelection(attemptId, quizVersionId, sessionId, selection);
    },
    [attemptId, quizVersionId, sessionId],
  );

  const startHook = useStartAttempt({ quizId });
  const submitHook = useSubmitAnswer({ attemptId, quizVersionId });
  const completeHook = useCompleteAttempt({ attemptId, quizVersionId, quizId });
  const deleteHook = useDeleteAnswer({ attemptId, quizVersionId });
  const abandonHook = useAbandonAttempt({ attemptId, quizVersionId, quizId });

  React.useEffect(() => {
    const outcome = startHook.outcome;
    if (!outcome) return;
    if (outcome.kind === "starting") {
      setOverlayStatus("starting");
      return;
    }
    if (outcome.kind === "success") {
      setOverlayStatus("in_progress");
      setAttemptId(outcome.attemptId);
      if (idOrSlug) {
        setNavigation({
          kind: "push_attempt",
          href: `/quizzes/${encodeURIComponent(idOrSlug)}/attempt`,
        });
      }
      startHook.reset();
      return;
    }
    if (outcome.kind === "already_started") {
      void retryActive();
      setOverlayStatus("idle");
      startHook.reset();
      return;
    }
    if (outcome.kind === "quiz_unpublished") {
      if (idOrSlug) {
        setNavigation({
          kind: "push_quiz",
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
      setOverlayStatus("idle");
      startHook.reset();
      return;
    }
    if (outcome.kind === "retryable") {
      setOverlayStatus("idle");
      return;
    }
    if (outcome.kind === "cooldown" || outcome.kind === "idle") {
      return;
    }
  }, [startHook.outcome, startHook, idOrSlug, retryActive]);

  React.useEffect(() => {
    const outcome = submitHook.outcome;
    if (!outcome) return;
    if (outcome.kind === "submitting") {
      setOverlayStatus("submitting");
      return;
    }
    if (outcome.kind === "success" || outcome.kind === "already_answered") {
      setOverlayStatus("in_progress");
      submitHook.reset();
      return;
    }
    if (
      outcome.kind === "question_invalid" ||
      outcome.kind === "forbidden" ||
      outcome.kind === "not_active"
    ) {
      setOverlayStatus("idle");
      submitHook.reset();
      return;
    }
    if (outcome.kind === "invalid" || outcome.kind === "retryable") {
      setOverlayStatus("idle");
      submitHook.reset();
      return;
    }
    if (outcome.kind === "cooldown" || outcome.kind === "idle") {
      return;
    }
  }, [submitHook.outcome, submitHook]);

  React.useEffect(() => {
    const outcome = completeHook.outcome;
    if (!outcome) return;
    if (outcome.kind === "completing") {
      setOverlayStatus("completing");
      return;
    }
    if (outcome.kind === "success") {
      setOverlayStatus("completed");
      completeHook.reset();
      return;
    }
    if (outcome.kind === "not_active") {
      setOverlayStatus("completed");
      completeHook.reset();
      return;
    }
    if (
      outcome.kind === "redirect" ||
      outcome.kind === "validation" ||
      outcome.kind === "retryable"
    ) {
      setOverlayStatus("idle");
      completeHook.reset();
      return;
    }
    if (outcome.kind === "cooldown" || outcome.kind === "idle") {
      return;
    }
  }, [completeHook.outcome, completeHook]);

  React.useEffect(() => {
    const outcome = abandonHook.outcome;
    if (!outcome) return;
    if (outcome.kind === "abandoning") {
      setOverlayStatus("abandoning");
      return;
    }
    if (outcome.kind === "success" || outcome.kind === "not_active") {
      setOverlayStatus("abandoned");
      abandonHook.reset();
      return;
    }
    if (
      outcome.kind === "forbidden" ||
      outcome.kind === "not_found" ||
      outcome.kind === "retryable"
    ) {
      setOverlayStatus("idle");
      abandonHook.reset();
      return;
    }
  }, [abandonHook.outcome, abandonHook]);

  const start = React.useCallback(async () => {
    const outcome = await startHook.start();
    if (outcome.kind === "already_started") {
      await retryActive();
    }
  }, [startHook, retryActive]);

  const selectAnswer = React.useCallback(
    async (
      question: QuizQuestionPlayerDto,
      selection: AnswerSelection,
    ): Promise<void> => {
      if (!attemptId || !quizVersionId) return;

      const questionId = question.questionId;
      const wasSubmitted = Boolean(submittedAnswers[questionId]);

      if (wasSubmitted) {
        await deleteHook.withdraw(questionId);
      }

      await submitHook.submit(question, selection, null);
    },
    [
      attemptId,
      quizVersionId,
      submittedAnswers,
      deleteHook,
      submitHook,
    ],
  );

  const submitAnswer = selectAnswer;

  const isCompletingRef = React.useRef(false);

  const completeQuiz = React.useCallback(async () => {
    if (isCompletingRef.current) return;
    if (!questions || !sessionId || !attemptId || !quizVersionId) return;

    isCompletingRef.current = true;
    setOverlayStatus("submitting");

    try {
      for (const question of questions) {
        const draft = draftsRef.current[question.questionId];
        const existing = submittedAnswers[question.questionId];
        if (existing) {
          let isSameSelection = false;
          if (draft?.kind === "multiple_choice") {
            isSameSelection =
              existing.selectedOptionId === draft.selectedOptionIds[0];
          } else if (draft?.kind === "true_false") {
            const opts = question.answerOptions;
            const trueOpt = opts.find(
              (o) =>
                typeof o.value === "string" && o.value.toLowerCase() === "true",
            );
            const falseOpt = opts.find(
              (o) =>
                typeof o.value === "string" && o.value.toLowerCase() === "false",
            );
            const targetOptId = draft.value
              ? trueOpt?.optionId
              : falseOpt?.optionId;
            isSameSelection = existing.selectedOptionId === targetOptId;
          }
          if (isSameSelection) {
            continue;
          }
          await deleteHook.withdraw(question.questionId);
        }
        if (draft) {
          await submitHook.submit(question, draft, null);
        }
      }

      const outcome = await completeHook.complete();
      if (outcome.kind === "success" && outcome.result) {
        recordCompletionSuccess(attemptId, quizVersionId, sessionId, {
          ...(outcome.result as unknown as import("@/features/attempts/stores/useAttemptsStore").CompletedAttemptSnapshot),
          correctCount: outcome.result.correctCount ?? null,
          xpEarned: outcome.result.xpEarned ?? 0,
          finishedAt: outcome.result.finishedAt ?? new Date().toISOString(),
        });

        if (idOrSlug) {
          const resultsHref = attemptId
            ? `/quizzes/${encodeURIComponent(idOrSlug)}/results?attemptId=${encodeURIComponent(attemptId)}`
            : `/quizzes/${encodeURIComponent(idOrSlug)}/results`;
          setNavigation({
            kind: "push_attempt",
            href: resultsHref,
          });
        }
        setOverlayStatus("completed");
      } else if (outcome.kind === "not_active") {
        if (idOrSlug) {
          const resultsHref = attemptId
            ? `/quizzes/${encodeURIComponent(idOrSlug)}/results?attemptId=${encodeURIComponent(attemptId)}`
            : `/quizzes/${encodeURIComponent(idOrSlug)}/results`;
          setNavigation({
            kind: "push_attempt",
            href: resultsHref,
          });
        }
        setOverlayStatus("completed");
      } else {
        setOverlayStatus("idle");
        if ("error" in outcome && outcome.error) {
          throw outcome.error;
        }
      }
    } finally {
      isCompletingRef.current = false;
    }
  }, [
    questions,
    sessionId,
    attemptId,
    quizVersionId,
    submittedAnswers,
    deleteHook,
    submitHook,
    completeHook,
    idOrSlug,
  ]);

  const abandon = React.useCallback(async () => {
    try {
      if (attemptId && quizVersionId) {
        await abandonHook.confirm();
      }
    } finally {
      if (idOrSlug) {
        setNavigation({
          kind: "push_quiz",
          href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
    }
  }, [attemptId, quizVersionId, abandonHook, idOrSlug]);

  React.useEffect(() => {
    if (status === "abandoned" && attemptId) {
      resetAttempt(attemptId);
    }
  }, [status, attemptId]);

  return {
    status,
    activeAttempt,
    attemptId,
    isActiveLoading,
    hasHydrated: hydration.hasResolved,
    submittedAnswers,
    navigation,
    error:
      startHook.error ??
      submitHook.error ??
      completeHook.error ??
      abandonHook.error ??
      hydration.error,
    currentIndex: 0,
    totalQuestions: questions?.length ?? 0,
    questions: questions ?? [],
    drafts,
    updateDraft,
    submitAnswer,
    selectAnswer,
    completeQuiz,
    start,
    abandon,
    consumeNavigation,
  };
}
