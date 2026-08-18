

import * as React from 'react';

import { ApiError } from '@/lib/api';

import { useAttemptHydration } from '@/features/attempts/hooks/useAttemptHydration';
import { useActiveAttempt } from '@/features/attempts/hooks/useActiveAttempt';
import { useAttemptCrossTabSync } from '@/features/attempts/hooks/useAttemptCrossTabSync';
import { useStartAttempt } from '@/features/attempts/hooks/useStartAttempt';
import { useSubmitAnswer } from '@/features/attempts/hooks/useSubmitAnswer';
import { useCompleteAttempt } from '@/features/attempts/hooks/useCompleteAttempt';
import { useDeleteAnswer } from '@/features/attempts/hooks/useDeleteAnswer';
import {
type AnswerSelection,
type AttemptRunnerStatus,
type SubmittedAnswersMap,
statusFromAttempt,
statusFromAttemptSummary,
} from '@/features/attempts/types/attempt-runner.types';
import {
hydrateAttemptEntry,
recordCompletionSuccess,
resetAttempt,
setDraftSelection,
} from '@/features/attempts/stores/useAttemptsStore';

import { useAuthSession } from '@/features/auth/hooks/use-auth-session';

import type {
AttemptSummaryResponseDto,
QuizQuestionPlayerDto,
} from '@/lib/api/generated/schemas';

export type AttemptRunnerNavigation =
| { kind: 'push_attempt'; href: string }
  | { kind: 'push_quiz'; href: string }
  | { kind: 'replace_login'; href: string };

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

submitAnswer: (question: QuizQuestionPlayerDto, selection: AnswerSelection) => void;

selectAnswer: (question: QuizQuestionPlayerDto, selection: AnswerSelection) => void;

completeQuiz: () => Promise<void>;

start: () => Promise<void>;

abandon: () => Promise<void>;

consumeNavigation: () => void;
}

export function useAttemptRunner(
params: UseAttemptRunnerParams,
): UseAttemptRunnerResult {
const { quizId, quizVersionId, idOrSlug, questions } = params;

const { bootstrapState, currentUser } = useAuthSession();
const sessionId = React.useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

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

const wireStatus: AttemptRunnerStatus | null = React.useMemo(() => {
if (hydration.detail) return statusFromAttempt(hydration.detail.status);
if (activeAttempt) return statusFromAttemptSummary(activeAttempt);
return null;
  }, [hydration.detail, activeAttempt]);

const [overlayStatus, setOverlayStatus] =
React.useState<AttemptRunnerStatus>('idle');

const status: AttemptRunnerStatus = React.useMemo(() => {
if (
overlayStatus === 'starting'
|| overlayStatus === 'submitting'
|| overlayStatus === 'abandoning'
|| overlayStatus === 'completing'
    ) {
return overlayStatus;
    }
return wireStatus ?? overlayStatus;
  }, [overlayStatus, wireStatus]);

useAttemptCrossTabSync({ quizVersionId });

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

const [drafts, setDrafts] = React.useState<Record<string, AnswerSelection>>({});
const draftsRef = React.useRef<Record<string, AnswerSelection>>({});

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
const completeHook = useCompleteAttempt({ attemptId, quizVersionId });
const deleteHook = useDeleteAnswer({ attemptId, quizVersionId });

React.useEffect(() => {
const outcome = startHook.outcome;
if (!outcome) return;
if (outcome.kind === 'starting') {
setOverlayStatus('starting');
return;
    }
if (outcome.kind === 'success') {
setOverlayStatus('in_progress');
setAttemptId(outcome.attemptId);
if (idOrSlug) {
setNavigation({
kind: 'push_attempt',
href: `/quizzes/${encodeURIComponent(idOrSlug)}/attempt`,
        });
      }
startHook.reset();
return;
    }
if (outcome.kind === 'already_started') {
void retryActive();
setOverlayStatus('idle');
startHook.reset();
return;
    }
if (outcome.kind === 'quiz_unpublished') {
if (idOrSlug) {
setNavigation({
kind: 'push_quiz',
href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
        });
      }
setOverlayStatus('idle');
startHook.reset();
return;
    }
if (outcome.kind === 'retryable') {
setOverlayStatus('idle');
return;
    }
if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
return;
    }
  }, [startHook.outcome, startHook, idOrSlug, retryActive]);

React.useEffect(() => {
const outcome = submitHook.outcome;
if (!outcome) return;
if (outcome.kind === 'submitting') {
setOverlayStatus('submitting');
return;
    }
if (outcome.kind === 'success' || outcome.kind === 'already_answered') {
setOverlayStatus('in_progress');
submitHook.reset();
return;
    }
if (outcome.kind === 'question_invalid' || outcome.kind === 'forbidden' || outcome.kind === 'not_active') {
setOverlayStatus('idle');
submitHook.reset();
return;
    }
if (outcome.kind === 'invalid' || outcome.kind === 'retryable') {
setOverlayStatus('idle');
submitHook.reset();
return;
    }
if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
return;
    }
  }, [submitHook.outcome, submitHook]);

React.useEffect(() => {
const outcome = completeHook.outcome;
if (!outcome) return;
if (outcome.kind === 'completing') {
setOverlayStatus('completing');
return;
    }
if (outcome.kind === 'success') {
setOverlayStatus('completed');
completeHook.reset();
return;
    }
if (outcome.kind === 'not_active') {
setOverlayStatus('completed');
completeHook.reset();
return;
    }
if (outcome.kind === 'redirect' || outcome.kind === 'validation' || outcome.kind === 'retryable') {
setOverlayStatus('idle');
completeHook.reset();
return;
    }
if (outcome.kind === 'cooldown' || outcome.kind === 'idle') {
return;
    }
  }, [completeHook.outcome, completeHook]);

const start = React.useCallback(async () => {
const outcome = await startHook.start();
if (outcome.kind === 'already_started') {
await retryActive();
    }
  }, [startHook, retryActive]);

const selectAnswer = React.useCallback(
(question: QuizQuestionPlayerDto, selection: AnswerSelection): void => {
if (!attemptId || !quizVersionId) return;

const questionId = question.questionId;
const wasSubmitted = Boolean(hydration.submittedAnswers[questionId]);

if (wasSubmitted) {
void deleteHook.withdraw(questionId);
      }

void submitHook.submit(question, selection, null);
    },
[attemptId, quizVersionId, hydration.submittedAnswers, deleteHook, submitHook],
  );

const submitAnswer = selectAnswer;

const completeQuiz = React.useCallback(async () => {
if (!questions || !sessionId || !attemptId || !quizVersionId) return;

setOverlayStatus('submitting');

for (const question of questions) {
const draft = draftsRef.current[question.questionId];
if (draft) {
await submitHook.submit(question, draft, null);
      }
    }

const outcome = await completeHook.complete();
if (outcome.kind === 'success' && outcome.result) {

recordCompletionSuccess(attemptId, quizVersionId, sessionId, {
scorePercent: outcome.result.scorePercent ?? null,
correctCount: outcome.result.correctCount ?? null,
xpEarned: outcome.result.xpEarned ?? 0,
finishedAt: outcome.result.finishedAt ?? new Date().toISOString(),
      });

if (idOrSlug) {
setNavigation({
kind: 'push_attempt',
href: `/quizzes/${encodeURIComponent(idOrSlug)}/results`,
        });
      }
setOverlayStatus('completed');
    } else if (outcome.kind === 'not_active') {

if (idOrSlug) {
setNavigation({
kind: 'push_attempt',
href: `/quizzes/${encodeURIComponent(idOrSlug)}/results`,
        });
      }
setOverlayStatus('completed');
    } else {
setOverlayStatus('idle');
    }
  }, [questions, sessionId, attemptId, quizVersionId, submitHook, completeHook, idOrSlug]);

const abandon = React.useCallback(async () => {

if (idOrSlug) {
setNavigation({
kind: 'push_quiz',
href: `/quizzes/${encodeURIComponent(idOrSlug)}`,
      });
    }
  }, [idOrSlug]);

React.useEffect(() => {
if (status === 'abandoned' && attemptId) {
resetAttempt(attemptId);
    }
  }, [status, attemptId]);

return {
status,
activeAttempt,
attemptId,
isActiveLoading,
hasHydrated: hydration.hasResolved,
submittedAnswers: hydration.submittedAnswers,
navigation,
error:
startHook.error
?? submitHook.error
?? completeHook.error
?? hydration.error,
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
