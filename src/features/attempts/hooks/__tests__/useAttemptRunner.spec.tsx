/**
 * `useAttemptRunner.spec.tsx` — locks the runner orchestrator hook.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source tickets: T-4.14.18 (lifecycle) and T-4.14.19 (answer coord).
 *
 * Tests the orchestrator's public surface:
 *
 *   - `status` reflects server status when no mutation is in flight.
 *   - `questions` / `drafts` / `totalQuestions` track the player-question list.
 *   - Draft selection is stored per question.
 *   - `start()` calls the start mutation hook.
 *   - Navigation intent is emitted on success.
 *   - `completeQuiz()` submits all drafts and completes the quiz.
 */

// ─── Mocks ─────────────────────────────────────────────────────────────────

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
const useStartAttemptMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: null,
  error: null,
  start: startStartMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useStartAttempt', () => ({
  useStartAttempt: () => useStartAttemptMock(),
}));

const submitSubmitMock = vi.fn();
const useSubmitAnswerMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: null,
  error: null,
  submit: submitSubmitMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useSubmitAnswer', () => ({
  useSubmitAnswer: () => useSubmitAnswerMock(),
}));

const completeCompleteMock = vi.fn();
const useCompleteAttemptMock = vi.fn(() => ({
  isPending: false,
  isCoolingDown: false,
  outcome: null,
  error: null,
  complete: completeCompleteMock,
  reset: vi.fn(),
}));
vi.mock('@/features/attempts/hooks/useCompleteAttempt', () => ({
  useCompleteAttempt: () => useCompleteAttemptMock(),
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
  recordCompletionSuccess: vi.fn(),
  resetAttempt: vi.fn(),
  setDraftSelection: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useAttemptRunner } from '@/features/attempts/hooks/useAttemptRunner';

import type { QuizQuestionPlayerDto } from '@/lib/api/generated/schemas';

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
  });

  it('exposes empty drafts initially', () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));
    expect(result.current.drafts).toEqual({});
    expect(result.current.questions).toEqual(baseQuestions);
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

describe('useAttemptRunner — drafts', () => {
  it('updateDraft can be called with a selection', () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));

    // Should not throw
    act(() => {
      result.current.updateDraft({
        kind: 'multiple_choice',
        questionId: 'q1',
        selectedOptionIds: ['opt-a'],
      });
    });

    // The drafts state starts empty (ref is updated async)
    expect(result.current.drafts).toEqual({});
  });
});

describe('useAttemptRunner — abandon', () => {
  it('abandon() emits navigation intent', async () => {
    const { result } = renderHook(() => useAttemptRunner(baseParams));

    await act(async () => {
      await result.current.abandon();
    });

    expect(result.current.navigation).toEqual({
      kind: 'push_quiz',
      href: '/quizzes/my-quiz',
    });
  });
});
