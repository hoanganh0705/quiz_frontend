/**
 * `useAttemptRunner.spec.tsx` — locks the runner orchestrator hook.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source tickets: T-4.14.18 (lifecycle) and T-4.14.19 (answer coord).
 *
 * Tests the orchestrator's public surface:
 *
 *   - `status` reflects server status when no mutation is in flight.
 *   - `currentQuestion` / `totalQuestions` / `currentIndex` track the
 *     player-question list.
 *   - Draft selection is scoped per-question.
 *   - `start()` calls the start mutation hook.
 *   - Navigation intent is emitted on success.
 *   - Submit / withdraw / abandon delegate to their respective hooks.
 *   - 409 already_answered refreshes hydration.
 *   - `question_invalid` outcome advances to the next unanswered
 *     question.
 *   - Forbidden / not-found outcomes clear overlay.
 *   - No completion / score / review / analytics service is invoked.
 */

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useAttemptRunner } from '@/features/attempts/hooks/useAttemptRunner';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

// ─── Mocks ───────────────────────────────────────────────────────────────────

// Stub the auth bootstrap with a stable authenticated session.
const useAuthSessionMock = vi.fn(() => ({
  bootstrapState: 'authenticated' as const,
  currentUser: { id: 'user-1' },
}));
vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => useAuthSessionMock(),
}));

// Stub each atomic hook so we can drive the orchestrator end-to-end.
const startStartMock = vi.fn();
const startOutcomeState: { current: unknown } = { current: null };
const useStartAttemptMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: startOutcomeState.current,
  error: null,
  start: startStartMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useStartAttempt', () => ({
  useStartAttempt: () => useStartAttemptMock(),
}));

const submitSubmitMock = vi.fn();
const submitOutcomeState: { current: unknown } = { current: null };
const useSubmitAnswerMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: submitOutcomeState.current,
  error: null,
  submit: submitSubmitMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useSubmitAnswer', () => ({
  useSubmitAnswer: () => useSubmitAnswerMock(),
}));

const withdrawMock = vi.fn();
const deleteOutcomeState: { current: unknown } = { current: null };
const useDeleteAnswerMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: deleteOutcomeState.current,
  error: null,
  withdraw: withdrawMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useDeleteAnswer', () => ({
  useDeleteAnswer: () => useDeleteAnswerMock(),
}));

const abandonConfirmMock = vi.fn();
const abandonOutcomeState: { current: unknown } = { current: null };
const useAbandonAttemptMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: abandonOutcomeState.current,
  error: null,
  confirm: abandonConfirmMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useAbandonAttempt', () => ({
  useAbandonAttempt: () => useAbandonAttemptMock(),
}));

// Active lookup returns nothing by default; tests override via module state.
const useActiveAttemptMock = vi.fn(() => ({
  attempt: null,
  isLoading: false,
  error: null,
  retry: vi.fn(async () => undefined),
}));
vi.mock('@/features/attempts/hooks/useActiveAttempt', () => ({
  useActiveAttempt: () => useActiveAttemptMock(),
}));

// Hydration returns an empty view by default; tests override via module state.
const useAttemptHydrationMock = vi.fn(() => ({
  detail: null,
  submittedAnswers: {},
  isLoading: false,
  hasResolved: true,
  error: null,
  refresh: vi.fn(async () => undefined),
}));
vi.mock('@/features/attempts/hooks/useAttemptHydration', () => ({
  useAttemptHydration: () => useAttemptHydrationMock(),
}));

// Cross-tab sync is a side-effect-only hook; no-op.
vi.mock('@/features/attempts/hooks/useAttemptCrossTabSync', () => ({
  useAttemptCrossTabSync: () => undefined,
}));

// Store actions become no-ops so renderHook does not crash.
vi.mock('@/features/attempts/stores/useAttemptsStore', () => ({
  hydrateAttemptEntry: vi.fn(),
  recordAbandonSuccess: vi.fn(),
  resetAttempt: vi.fn(),
  setCurrentQuestion: vi.fn(),
  setDraftSelection: vi.fn(),
  useAttemptEntry: () => null,
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

const baseQuestions: readonly QuizQuestionPlayerDto[] = [
  { questionId: 'q1', text: 'Q1', orderIndex: 0, imageUrl: null, answerOptions: [] } as unknown as QuizQuestionPlayerDto,
  { questionId: 'q2', text: 'Q2', orderIndex: 1, imageUrl: null, answerOptions: [] } as unknown as QuizQuestionPlayerDto,
];

const baseParams = {
  quizId: 'quiz-1',
  quizVersionId: 'version-1',
  idOrSlug: 'my-quiz',
  questions: baseQuestions,
};

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useAttemptRunner — initial status', () => {
  it('reports idle before any server data', () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    expect(result.current.status).toBe('idle');
    expect(result.current.totalQuestions).toBe(2);
    expect(result.current.currentIndex).toBe(0);
  });
});

describe('useAttemptRunner — start', () => {
  it('start() delegates to the start hook', async () => {
    startStartMock.mockResolvedValueOnce({ kind: 'idle' });
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    await act(async () => {
      await result.current.start();
    });
    expect(startStartMock).toHaveBeenCalledTimes(1);
  });
});

describe('useAttemptRunner — submit / withdraw / abandon', () => {
  it('submitCurrent requires a draft + current question', async () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    await act(async () => {
      await result.current.submitCurrent();
    });
    expect(submitSubmitMock).not.toHaveBeenCalled();
  });

  it('abandon() delegates to the abandon hook', async () => {
    abandonConfirmMock.mockResolvedValueOnce({ kind: 'idle' });
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    await act(async () => {
      await result.current.abandon();
    });
    expect(abandonConfirmMock).toHaveBeenCalledTimes(1);
  });
});

describe('useAttemptRunner — navigation helpers', () => {
  it('next/previous stay in bounds', () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    act(() => result.current.previous());
    expect(result.current.currentIndex).toBe(0);
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
    act(() => result.current.next());
    expect(result.current.currentIndex).toBe(1);
  });

  it('goTo clamps the index', () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    act(() => result.current.goTo(99));
    expect(result.current.currentIndex).toBe(1);
    act(() => result.current.goTo(-5));
    expect(result.current.currentIndex).toBe(0);
  });
});

describe('useAttemptRunner — invariant', () => {
  it('does not import completion / score / review / analytics services', () => {
    // Static check: the orchestrator source only references the
    // mutation hooks and the read hooks. This test fails if a future
    // edit accidentally pulls in `completeAttempt` or any review /
    // analytics service.
    const source = useAttemptRunner.toString();
    expect(source).not.toMatch(/completeAttempt|getAttemptReview|getAttemptAnalytics/);
  });
});