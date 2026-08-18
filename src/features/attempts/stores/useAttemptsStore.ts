

import { create } from 'zustand';

import type {
AnswerSelection,
AttemptRunnerStatus,
SubmittedAnswersMap,
} from '../types/attempt-runner.types';

export interface AttemptEntry {
status: AttemptRunnerStatus;

currentQuestionId: string | null;

draftSelection: AnswerSelection | null;

submittedAnswers: SubmittedAnswersMap;

cooldownUntil: number | null;

error: import('@/lib/api').ApiError | null;

sessionId: string | null;

completedSnapshot?: CompletedAttemptSnapshot;
}

export interface AttemptsDataState {

attemptsById: Record<string, AttemptEntry>;

attemptsByQuizVersionId: Record<string, string>;
}

function makeEmptyEntry(sessionId: string | null): AttemptEntry {
return {
status: 'idle',
currentQuestionId: null,
draftSelection: null,
submittedAnswers: {},
cooldownUntil: null,
error: null,
sessionId,
  };
}

export const useAttemptsStore = create<AttemptsDataState>()(() => ({
attemptsById: {},
attemptsByQuizVersionId: {},
}));

function ensureEntry(
attemptId: string,
quizVersionId: string,
sessionId: string | null,
): AttemptEntry {
const existing = useAttemptsStore.getState().attemptsById[attemptId];
if (existing !== undefined) return existing;
const fresh = makeEmptyEntry(sessionId);
useAttemptsStore.setState((s) => ({
attemptsById: { ...s.attemptsById, [attemptId]: fresh },
attemptsByQuizVersionId: {
...s.attemptsByQuizVersionId,
[quizVersionId]: attemptId,
    },
  }));
return useAttemptsStore.getState().attemptsById[attemptId]!;
}

export function hydrateAttemptEntry(
attemptId: string,
quizVersionId: string,
sessionId: string,
snapshot: Partial<AttemptEntry>,
): void {
const current = useAttemptsStore.getState().attemptsById[attemptId];
if (current && current.sessionId !== null && current.sessionId !== sessionId) {

return;
  }
const base = current ?? makeEmptyEntry(sessionId);
const next: AttemptEntry = {
...base,
...snapshot,
sessionId,
  };
useAttemptsStore.setState((s) => ({
attemptsById: { ...s.attemptsById, [attemptId]: next },
attemptsByQuizVersionId: {
...s.attemptsByQuizVersionId,
[quizVersionId]: attemptId,
    },
  }));
}

export function setAttemptStatus(
attemptId: string,
quizVersionId: string,
sessionId: string,
status: AttemptRunnerStatus,
): void {
if (status === 'completing' || status === 'completed') {
return;
  }
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: { ...entry, status },
      },
    };
  });
}

export function setCurrentQuestion(
attemptId: string,
quizVersionId: string,
sessionId: string,
questionId: string | null,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: { ...entry, currentQuestionId: questionId },
      },
    };
  });
}

export function setDraftSelection(
attemptId: string,
quizVersionId: string,
sessionId: string,
selection: AnswerSelection | null,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: { ...entry, draftSelection: selection },
      },
    };
  });
}

export function beginSubmit(
attemptId: string,
quizVersionId: string,
sessionId: string,
cooldownMs: number,
): number {
ensureEntry(attemptId, quizVersionId, sessionId);
const cooldownUntil = Date.now() + cooldownMs;
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'submitting',
cooldownUntil,
error: null,
        },
      },
    };
  });
return cooldownUntil;
}

export function recordSubmitSuccess(
attemptId: string,
quizVersionId: string,
sessionId: string,
submitted: AttemptEntry['submittedAnswers'][string],
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
const nextAnswers: SubmittedAnswersMap = {
...entry.submittedAnswers,
[submitted.questionId]: submitted,
    };
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'in_progress',
cooldownUntil: null,
draftSelection: null,
submittedAnswers: nextAnswers,
error: null,
        },
      },
    };
  });
}

export function recordWithdrawSuccess(
attemptId: string,
quizVersionId: string,
sessionId: string,
questionId: string,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
const { [questionId]: _removed, ...nextAnswers } = entry.submittedAnswers;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'in_progress',
cooldownUntil: null,
submittedAnswers: nextAnswers,
error: null,
        },
      },
    };
  });
}

export function beginAbandon(
attemptId: string,
quizVersionId: string,
sessionId: string,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'abandoning',
error: null,
        },
      },
    };
  });
}

export function recordAbandonSuccess(
attemptId: string,
quizVersionId: string,
sessionId: string,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'abandoned',
cooldownUntil: null,
error: null,
        },
      },
    };
  });
}

export function recordMutationFailure(
attemptId: string,
quizVersionId: string,
sessionId: string,
error: import('@/lib/api').ApiError,
retryableStatus: Extract<AttemptRunnerStatus, 'in_progress' | 'idle'>,
): void {
ensureEntry(attemptId, quizVersionId, sessionId);
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: retryableStatus,
cooldownUntil: null,
error,
        },
      },
    };
  });
}

export interface CompletedAttemptSnapshot {

scorePercent: number | null;

correctCount: number | null;

xpEarned: number;

finishedAt: string;
}

export interface CompletedAttemptEntryExtras {
completedSnapshot?: CompletedAttemptSnapshot;
}

export function beginCompletion(
attemptId: string,
quizVersionId: string,
sessionId: string,
cooldownMs: number,
): number {
ensureEntry(attemptId, quizVersionId, sessionId);
const cooldownUntil = Date.now() + cooldownMs;
useAttemptsStore.setState((s) => {
const entry = s.attemptsById[attemptId]!;
return {
attemptsById: {
...s.attemptsById,
[attemptId]: {
...entry,
status: 'completing',
cooldownUntil,
error: null,
        },
      },
    };
  });
return cooldownUntil;
}

export function recordCompletionSuccess(
attemptId: string,
quizVersionId: string,
sessionId: string,
snapshot: CompletedAttemptSnapshot,
): void {
const current = useAttemptsStore.getState().attemptsById[attemptId];
if (current && current.sessionId !== null && current.sessionId !== sessionId) {

return;
  }
const base = current ?? makeEmptyEntry(sessionId);
const next: AttemptEntry = {
...base,
status: 'completed',
cooldownUntil: null,
draftSelection: null,
error: null,
completedSnapshot: snapshot,
  };
useAttemptsStore.setState((s) => ({
attemptsById: { ...s.attemptsById, [attemptId]: next },
attemptsByQuizVersionId: {
...s.attemptsByQuizVersionId,
[quizVersionId]: attemptId,
    },
  }));
}

export function resetAttempt(attemptId: string): void {
useAttemptsStore.setState((s) => {
const { [attemptId]: _removed, ...nextById } = s.attemptsById;
const nextByQuizVersionId: Record<string, string> = {};
for (const [qvId, aId] of Object.entries(s.attemptsByQuizVersionId)) {
if (aId !== attemptId) {
nextByQuizVersionId[qvId] = aId;
      }
    }
return {
attemptsById: nextById,
attemptsByQuizVersionId: nextByQuizVersionId,
    };
  });
}

export function dropForeignEntries(sessionId: string): void {
useAttemptsStore.setState((s) => {
const nextById: Record<string, AttemptEntry> = {};
const nextByQuizVersionId: Record<string, string> = {};
for (const [attemptId, entry] of Object.entries(s.attemptsById)) {
if (entry.sessionId === sessionId) {
nextById[attemptId] = entry;
      }
    }
for (const [qvId, aId] of Object.entries(s.attemptsByQuizVersionId)) {
if (nextById[aId] !== undefined) {
nextByQuizVersionId[qvId] = aId;
      }
    }
return {
attemptsById: nextById,
attemptsByQuizVersionId: nextByQuizVersionId,
    };
  });
}

export const useAttemptEntry = (attemptId: string | null) =>
useAttemptsStore((s) =>
attemptId === null ? undefined : s.attemptsById[attemptId],
  );

export const useAttemptStatus = (attemptId: string | null) =>
useAttemptsStore((s) =>
attemptId === null ? 'idle' : s.attemptsById[attemptId]?.status ?? 'idle',
  );

export const useAttemptSubmittedAnswers = (attemptId: string | null) =>
useAttemptsStore((s) =>
attemptId === null ? {} : s.attemptsById[attemptId]?.submittedAnswers ?? {},
  );

export const useAttemptError = (attemptId: string | null) =>
useAttemptsStore((s) =>
attemptId === null ? null : s.attemptsById[attemptId]?.error ?? null,
  );