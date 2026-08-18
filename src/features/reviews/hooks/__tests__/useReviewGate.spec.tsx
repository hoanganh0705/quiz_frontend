

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useReviewGate } from '@/features/reviews/hooks/useReviewGate';
import {
myQuizReviewKey,
reviewQuizAttemptKey,
} from '@/features/reviews/types';

const useAuthSessionMock = vi.fn();
const useMyQuizReviewMock = vi.fn();
const useCompletedQuizAttemptMock = vi.fn();

const globalMutateMock = vi.hoisted(() =>
vi.fn().mockResolvedValue(undefined),
);

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: () => useAuthSessionMock(),
}));

vi.mock('@/features/reviews/hooks/useMyQuizReview', () => ({
useMyQuizReview: (params: unknown) => useMyQuizReviewMock(params),
}));

vi.mock('@/features/reviews/hooks/useCompletedQuizAttempt', () => ({
useCompletedQuizAttempt: (params: unknown) =>
useCompletedQuizAttemptMock(params),
}));

vi.mock('swr', async (importOriginal) => {
const real = await importOriginal<typeof import('swr')>();
return {
...real,
mutate: (...args: unknown[]) => globalMutateMock(...args),
  };
});

const QUIZ_ID = 'quiz-1';
const SESSION_ID = 'user-1';

function setBootstrap(
state: 'idle' | 'bootstrapping' | 'authenticated' | 'unauthenticated',
currentUser: { id: string; userId?: string } | null = null,
): void {
useAuthSessionMock.mockReturnValue({
bootstrapState: state,
isAuthenticated: state === 'authenticated' || state === 'bootstrapping',
currentUser:
state === 'authenticated' && currentUser
? { id: currentUser.id, userId: currentUser.id }
: null,
  });
}

function setMyReview(opts: {
review: unknown;
hasResolved: boolean;
isLoading?: boolean;
error: unknown;
}): void {
useMyQuizReviewMock.mockReturnValue({
review: opts.review,
isLoading: opts.isLoading ?? false,
hasResolved: opts.hasResolved,
error: opts.error,
retry: vi.fn(),
  });
}

function setAttempt(opts: {
hasCompletedAttempt: boolean;
isLoading?: boolean;
hasResolved: boolean;
error: unknown;
}): void {
useCompletedQuizAttemptMock.mockReturnValue({
hasCompletedAttempt: opts.hasCompletedAttempt,
isLoading: opts.isLoading ?? false,
error: opts.error,
retry: vi.fn(),
  });
}

beforeEach(() => {
vi.clearAllMocks();
globalMutateMock.mockClear();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('useReviewGate — branch resolution', () => {
it('renders `loading` while auth bootstrap is idle', () => {
setBootstrap('idle');
setMyReview({ review: null, hasResolved: false, error: null });
setAttempt({ hasCompletedAttempt: false, hasResolved: false, error: null });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('loading');
expect(result.current.isLoading).toBe(true);
  });

it('renders `loading` while auth bootstrap is bootstrapping', () => {
setBootstrap('bootstrapping');
setMyReview({ review: null, hasResolved: false, error: null });
setAttempt({ hasCompletedAttempt: false, hasResolved: false, error: null });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('loading');
  });

it('renders `unauthenticated` without firing private queries', () => {
setBootstrap('unauthenticated');

setMyReview({ review: null, hasResolved: false, error: null });
setAttempt({ hasCompletedAttempt: false, hasResolved: false, error: null });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('unauthenticated');
expect(result.current.isLoading).toBe(false);
  });

it('renders `existing-review` when my-review has resolved with a review, regardless of attempt state', () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({
review: { reviewId: 'r-1', rating: 5 },
hasResolved: true,
error: null,
    });

setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('existing-review');
if (result.current.state.kind === 'existing-review') {
expect(result.current.state.review.reviewId).toBe('r-1');
    }
  });

it('renders `eligible` when no review exists and a completed attempt exists', () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('eligible');
  });

it('renders `attempt-required` when no review exists and no completed attempt exists', () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: false,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('attempt-required');
  });

it('renders `loading` when my-review is unresolved but attempt has resolved', () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({
review: null,
hasResolved: false,
isLoading: true,
error: null,
    });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('loading');
  });

it('renders `loading` when my-review has resolved but attempt has not', () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: false,
hasResolved: false,
isLoading: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('loading');
  });
});

describe('useReviewGate — error classification', () => {
it('maps my-review 5xx to `error`, never to `attempt-required`', () => {
const myError = new Error('my-review 5xx');
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: myError });
setAttempt({
hasCompletedAttempt: false,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('error');
if (result.current.state.kind === 'error') {
expect(result.current.state.error).toBe(myError);
    }
  });

it('maps my-review 4xx (non-404) to `error`, never to `attempt-required`', () => {
const myError = new Error('REVIEW_FORBIDDEN');
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: myError });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('error');
  });

it('maps eligibility 5xx to `error`, never to `attempt-required`', () => {
const attemptError = new Error('attempts 5xx');
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: false,
hasResolved: true,
error: attemptError,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('error');
if (result.current.state.kind === 'error') {
expect(result.current.state.error).toBe(attemptError);
    }
  });

it('prefers the my-review error over the eligibility error when both fail', () => {
const myError = new Error('my-review 5xx');
const attemptError = new Error('attempts 5xx');
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: myError });
setAttempt({
hasCompletedAttempt: false,
hasResolved: true,
error: attemptError,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).toBe('error');
if (result.current.state.kind === 'error') {

expect(result.current.state.error).toBe(myError);
    }
  });

it('never reports `attempt-required` on an attempt query error', () => {
const attemptError = new Error('attempts 5xx');
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: false,
hasResolved: true,
error: attemptError,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

expect(result.current.state.kind).not.toBe('attempt-required');
  });
});

describe('useReviewGate — revalidate()', () => {
it('invalidates the session-scoped my-review key', async () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

await act(async () => {
await result.current.revalidate();
    });

const myKey = myQuizReviewKey(QUIZ_ID, SESSION_ID);
expect(globalMutateMock).toHaveBeenCalledWith(
myKey,
undefined,
expect.objectContaining({ revalidate: true }),
    );
  });

it('invalidates the session-scoped eligibility key', async () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() => useReviewGate({ quizId: QUIZ_ID }));

await act(async () => {
await result.current.revalidate();
    });

const eligibilityKey = reviewQuizAttemptKey(QUIZ_ID, SESSION_ID);
expect(globalMutateMock).toHaveBeenCalledWith(
eligibilityKey,
undefined,
expect.objectContaining({ revalidate: true }),
    );
  });

it('does not invalidate when quizId is null', async () => {
setBootstrap('authenticated', { id: SESSION_ID });
setMyReview({ review: null, hasResolved: true, error: null });
setAttempt({
hasCompletedAttempt: true,
hasResolved: true,
error: null,
    });

const { result } = renderHook(() =>
useReviewGate({ quizId: null }),
    );

await act(async () => {
await result.current.revalidate();
    });

expect(globalMutateMock).not.toHaveBeenCalled();
  });
});
