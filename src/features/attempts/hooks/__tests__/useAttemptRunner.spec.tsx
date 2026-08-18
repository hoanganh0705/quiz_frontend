

const useAuthSessionMock = vi.fn(() => ({
bootstrapState: 'authenticated' as const,
currentUser: { id: 'user-1' },
}));
vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: () => useAuthSessionMock(),
}));

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

const useActiveAttemptMock = vi.fn(() => ({
attempt: null,
isLoading: false,
error: null,
retry: vi.fn(async () => undefined),
}));
vi.mock('@/features/attempts/hooks/useActiveAttempt', () => ({
useActiveAttempt: () => useActiveAttemptMock(),
}));

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

vi.mock('@/features/attempts/hooks/useAttemptCrossTabSync', () => ({
useAttemptCrossTabSync: () => undefined,
}));

vi.mock('@/features/attempts/stores/useAttemptsStore', () => ({
hydrateAttemptEntry: vi.fn(),
recordCompletionSuccess: vi.fn(),
resetAttempt: vi.fn(),
setDraftSelection: vi.fn(),
}));

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

act(() => {
result.current.updateDraft({
kind: 'multiple_choice',
questionId: 'q1',
selectedOptionIds: ['opt-a'],
      });
    });

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
