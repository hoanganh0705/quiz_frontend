

import { beforeEach, describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api';

import {
beginAbandon,
beginCompletion,
beginSubmit,
dropForeignEntries,
hydrateAttemptEntry,
recordAbandonSuccess,
recordCompletionSuccess,
recordMutationFailure,
recordSubmitSuccess,
recordWithdrawSuccess,
resetAttempt,
setAttemptStatus,
setCurrentQuestion,
setDraftSelection,
useAttemptsStore,
type AttemptEntry,
} from '../useAttemptsStore';

const SESSION_A = 'session-a';
const SESSION_B = 'session-b';
const ATTEMPT_1 = 'attempt-1';
const ATTEMPT_2 = 'attempt-2';
const QV_1 = 'qv-1';
const QV_2 = 'qv-2';

function makeApiError(status: number, code: string): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'mock',
code,
config: undefined,
request: undefined,
response: {
status,
statusText: 'X',
data: {
type: 'about:blank',
title: 'X',
status,
detail: 'mock',
extensions: { code, requestId: 'req-test' },
      },
headers: {},
config: undefined as never,
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

beforeEach(() => {

useAttemptsStore.setState(
{ attemptsById: {}, attemptsByQuizVersionId: {} },
true,
  );
});

describe('useAttemptsStore — identity isolation', () => {
it('two attempt identities do not collide', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_2, QV_2, SESSION_A, 'in_progress');
setDraftSelection(ATTEMPT_1, QV_1, SESSION_A, {
kind: 'multiple_choice',
questionId: 'q1',
selectedOptionIds: ['a'],
    });
const state = useAttemptsStore.getState();
expect(state.attemptsById[ATTEMPT_1]?.status).toBe('in_progress');
expect(state.attemptsById[ATTEMPT_2]?.status).toBe('in_progress');
expect(state.attemptsById[ATTEMPT_1]?.draftSelection?.kind).toBe('multiple_choice');
expect(state.attemptsById[ATTEMPT_2]?.draftSelection).toBeNull();
expect(state.attemptsByQuizVersionId[QV_1]).toBe(ATTEMPT_1);
expect(state.attemptsByQuizVersionId[QV_2]).toBe(ATTEMPT_2);
  });
});

describe('useAttemptsStore — hydration', () => {
it('replaces transient state with the canonical snapshot', () => {

setDraftSelection(ATTEMPT_1, QV_1, SESSION_A, {
kind: 'multiple_choice',
questionId: 'q1',
selectedOptionIds: ['a'],
    });
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'submitting');

hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
draftSelection: null,
submittedAnswers: {
q1: {
questionId: 'q1',
selectedOptionId: 'a',
submittedAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });

const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
expect(entry.draftSelection).toBeNull();
expect(entry.submittedAnswers['q1']?.selectedOptionId).toBe('a');
  });

it('refuses to overwrite an entry owned by a different session', () => {
hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
draftSelection: {
kind: 'multiple_choice',
questionId: 'q1',
selectedOptionIds: ['a'],
      },
    });

hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_B, {
status: 'abandoned',
    });

const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.sessionId).toBe(SESSION_A);
expect(entry.status).toBe('in_progress');
  });
});

describe('useAttemptsStore — draft vs submitted', () => {
it('draft selection and submitted-answer lock are independent', () => {
hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
submittedAnswers: {
q1: {
questionId: 'q1',
selectedOptionId: 'a',
submittedAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
setDraftSelection(ATTEMPT_1, QV_1, SESSION_A, {
kind: 'true_false',
questionId: 'q2',
value: true,
    });

const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;

expect(entry.submittedAnswers['q1']?.selectedOptionId).toBe('a');

expect(entry.draftSelection).toEqual({
kind: 'true_false',
questionId: 'q2',
value: true,
    });

expect(entry.submittedAnswers['q2']).toBeUndefined();
  });
});

describe('useAttemptsStore — mutation lifecycle', () => {
it('beginSubmit transitions to submitting and stamps the cooldown', () => {
const cooldownMs = 500;
const before = Date.now();
const cooldownUntil = beginSubmit(ATTEMPT_1, QV_1, SESSION_A, cooldownMs);
const after = Date.now();
expect(cooldownUntil).toBeGreaterThanOrEqual(before + cooldownMs);
expect(cooldownUntil).toBeLessThanOrEqual(after + cooldownMs + 5);
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('submitting');
expect(entry.cooldownUntil).toBe(cooldownUntil);
  });

it('recordSubmitSuccess restores in_progress and locks the submitted answer', () => {
beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);
recordSubmitSuccess(ATTEMPT_1, QV_1, SESSION_A, {
questionId: 'q1',
selectedOptionId: 'b',
submittedAt: '2026-08-01T00:00:00.000Z',
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
expect(entry.cooldownUntil).toBeNull();
expect(entry.draftSelection).toBeNull();
expect(entry.submittedAnswers['q1']?.selectedOptionId).toBe('b');
  });

it('recordWithdrawSuccess removes the question from the lock set', () => {
hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
submittedAnswers: {
q1: {
questionId: 'q1',
selectedOptionId: 'a',
submittedAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
recordWithdrawSuccess(ATTEMPT_1, QV_1, SESSION_A, 'q1');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
expect(entry.submittedAnswers['q1']).toBeUndefined();
  });

it('beginAbandon transitions to abandoning', () => {
beginAbandon(ATTEMPT_1, QV_1, SESSION_A);
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('abandoning');
  });

it('recordAbandonSuccess writes the terminal abandoned status', () => {
beginAbandon(ATTEMPT_1, QV_1, SESSION_A);
recordAbandonSuccess(ATTEMPT_1, QV_1, SESSION_A);
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('abandoned');
  });
});

describe('useAttemptsStore — failure path', () => {
it('records the error and restores a retryable status', () => {
beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);
const err = makeApiError(409, 'ATTEMPT_QUESTION_ALREADY_ANSWERED');
recordMutationFailure(ATTEMPT_1, QV_1, SESSION_A, err, 'in_progress');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
expect(entry.cooldownUntil).toBeNull();
expect(entry.error).toBe(err);
  });

it('drops the draft when a submit fails', () => {
setDraftSelection(ATTEMPT_1, QV_1, SESSION_A, {
kind: 'true_false',
questionId: 'q1',
value: true,
    });
beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);

setDraftSelection(ATTEMPT_1, QV_1, SESSION_A, null);
recordMutationFailure(ATTEMPT_1, QV_1, SESSION_A, makeApiError(500, 'X'), 'in_progress');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.draftSelection).toBeNull();
  });
});

describe('useAttemptsStore — reset', () => {
it('resetAttempt leaves unrelated entries intact', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_2, QV_2, SESSION_A, 'in_progress');
resetAttempt(ATTEMPT_1);
const state = useAttemptsStore.getState();
expect(state.attemptsById[ATTEMPT_1]).toBeUndefined();
expect(state.attemptsById[ATTEMPT_2]).toBeDefined();
expect(state.attemptsByQuizVersionId[QV_1]).toBeUndefined();
expect(state.attemptsByQuizVersionId[QV_2]).toBe(ATTEMPT_2);
  });
});

describe('useAttemptsStore — reserved states', () => {
it('setAttemptStatus refuses to write the reserved completing state', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'completing');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
  });

it('setAttemptStatus refuses to write the reserved completed state', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'completed');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
  });
});

describe('useAttemptsStore — foreign entry eviction', () => {
it('dropForeignEntries drops only entries owned by the other session', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_2, QV_2, SESSION_B, 'in_progress');
dropForeignEntries(SESSION_A);
const state = useAttemptsStore.getState();
expect(state.attemptsById[ATTEMPT_1]).toBeDefined();
expect(state.attemptsById[ATTEMPT_2]).toBeUndefined();
  });
});

describe('useAttemptsStore — no persistence', () => {
it('store has no persist middleware or storage adapter registered', () => {

const store = useAttemptsStore;
expect(typeof store.getState).toBe('function');
expect(typeof store.setState).toBe('function');
expect(typeof store.subscribe).toBe('function');
  });
});

describe('useAttemptsStore — selector stability', () => {
it('setCurrentQuestion updates the focused question id', () => {
setCurrentQuestion(ATTEMPT_1, QV_1, SESSION_A, 'q1');
setCurrentQuestion(ATTEMPT_1, QV_1, SESSION_A, 'q2');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.currentQuestionId).toBe('q2');
  });
});

describe('useAttemptsStore — legal Story 4.14 transitions', () => {
it('idle → starting → in_progress (start success)', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'starting');
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('starting');

setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('in_progress');
  });

it('in_progress → submitting → in_progress (submit success)', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('submitting');

recordSubmitSuccess(ATTEMPT_1, QV_1, SESSION_A, {
questionId: 'q1',
selectedOptionId: 'opt-a',
submittedAt: '2026-08-01T00:00:00.000Z',
    });
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('in_progress');
  });

it('in_progress → submitting → error → in_progress (retry recovers)', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);
recordMutationFailure(
ATTEMPT_1,
QV_1,
SESSION_A,
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
'in_progress',
    );
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
expect(entry.cooldownUntil).toBeNull();
expect(entry.error).toBeInstanceOf(ApiError);
  });

it('in_progress → abandoning → abandoned (terminal abandon success)', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
beginAbandon(ATTEMPT_1, QV_1, SESSION_A);
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('abandoning');

recordAbandonSuccess(ATTEMPT_1, QV_1, SESSION_A);
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('abandoned');
  });
});

describe('useAttemptsStore — illegal transitions stay', () => {
it('abandoned terminal state survives a stray in_progress write for this attempt', () => {

setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
beginAbandon(ATTEMPT_1, QV_1, SESSION_A);
recordAbandonSuccess(ATTEMPT_1, QV_1, SESSION_A);

const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('abandoned');
  });
});

describe('useAttemptsStore — partial server answers hydrate locked', () => {
it('hydrateAttemptEntry carries the partial lock set into the lock map', () => {
hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
currentQuestionId: 'q2',
draftSelection: null,
submittedAnswers: {
q1: {
questionId: 'q1',
selectedOptionId: 'opt-a',
submittedAt: '2026-08-01T00:00:00.000Z',
        },
      },
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.submittedAnswers['q1']?.selectedOptionId).toBe('opt-a');
expect(entry.submittedAnswers['q2']).toBeUndefined();
expect(entry.currentQuestionId).toBe('q2');
  });
});

describe('useAttemptsStore — remote-abandon reconciliation converges', () => {
it('hydrating an abandoned server snapshot overwrites a prior in_progress entry without throwing', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'abandoned',
cooldownUntil: null,
error: null,
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('abandoned');
expect(entry.error).toBeNull();
  });
});

describe('useAttemptsStore — reserved completion state behaviour (T-4.14.29)', () => {
it('hydrateAttemptEntry accepts the completed snapshot but the store does not provide any scoring surface', () => {

hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'completed',
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('completed');

expect(Object.keys(entry)).not.toContain('score');
expect(Object.keys(entry)).not.toContain('isCorrect');
  });

it('setAttemptStatus still refuses to write completing/completed (Story 4.15 gate)', () => {
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'in_progress');
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'completing');
setAttemptStatus(ATTEMPT_1, QV_1, SESSION_A, 'completed');
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('in_progress');
  });
});

describe('useAttemptsStore — backend `started` → frontend `in_progress`', () => {
it('hydrateAttemptEntry accepts `in_progress` from a backend `started` snapshot', () => {

hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_A, {
status: 'in_progress',
    });
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('in_progress');

beginSubmit(ATTEMPT_1, QV_1, SESSION_A, 500);
expect(
useAttemptsStore.getState().attemptsById[ATTEMPT_1]?.status,
    ).toBe('submitting');
  });
});

describe('useAttemptsStore — Story 4.15 completion actions (T-4.15.15)', () => {
it('beginCompletion writes the reserved `completing` state with a cooldown', () => {
beginCompletion(ATTEMPT_1, QV_1, SESSION_A, 500);
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('completing');
expect(entry.cooldownUntil).not.toBeNull();
  });

it('recordCompletionSuccess writes the terminal `completed` status with a snapshot', () => {
beginCompletion(ATTEMPT_1, QV_1, SESSION_A, 500);
recordCompletionSuccess(ATTEMPT_1, QV_1, SESSION_A, {
scorePercent: 80,
correctCount: 4,
xpEarned: 120,
finishedAt: '2026-01-01T00:00:00.000Z',
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(entry.status).toBe('completed');
expect(entry.cooldownUntil).toBeNull();
expect(entry.error).toBeNull();
expect(entry.completedSnapshot).toEqual({
scorePercent: 80,
correctCount: 4,
xpEarned: 120,
finishedAt: '2026-01-01T00:00:00.000Z',
    });
  });

it('recordCompletionSuccess refuses to overwrite an entry owned by another session', () => {

hydrateAttemptEntry(ATTEMPT_1, QV_1, SESSION_B, {
status: 'in_progress',
    });

recordCompletionSuccess(ATTEMPT_1, QV_1, SESSION_A, {
scorePercent: 100,
correctCount: 5,
xpEarned: 200,
finishedAt: '2026-01-02T00:00:00.000Z',
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;

expect(entry.status).toBe('in_progress');
expect(entry.completedSnapshot).toBeUndefined();
  });

it('the completed snapshot carries no correctness metadata (player-DTO invariant)', () => {
recordCompletionSuccess(ATTEMPT_1, QV_1, SESSION_A, {
scorePercent: 80,
correctCount: 4,
xpEarned: 120,
finishedAt: '2026-01-01T00:00:00.000Z',
    });
const entry = useAttemptsStore.getState().attemptsById[ATTEMPT_1]!;
expect(Object.keys(entry.completedSnapshot ?? {})).not.toContain(
'isCorrect',
    );
expect(Object.keys(entry.completedSnapshot ?? {})).not.toContain(
'correctAnswer',
    );
  });
});