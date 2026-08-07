/**
 * `AttemptRunner.spec.tsx` — locks the runner composition.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.20.
 */

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AttemptRunner } from '@/features/attempts/components/AttemptRunner';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({
    bootstrapState: 'authenticated',
    currentUser: { id: 'user-1' },
  }),
}));

const runnerOutcomes: Record<string, unknown> = {};
const useAttemptRunnerMock = vi.fn(() => ({
  status: 'idle',
  activeAttempt: null,
  attemptId: null,
  isActiveLoading: false,
  hasHydrated: true,
  submittedAnswers: {},
  navigation: null,
  error: null,
  isSubmitting: () => false,
  currentIndex: 0,
  totalQuestions: 2,
  currentQuestion: null,
  draftSelection: null,
  updateDraft: vi.fn(),
  submitCurrent: vi.fn(async () => undefined),
  withdrawCurrent: vi.fn(async () => undefined),
  goTo: vi.fn(),
  previous: vi.fn(),
  next: vi.fn(),
  start: vi.fn(async () => undefined),
  abandon: vi.fn(async () => undefined),
  consumeNavigation: vi.fn(),
  ...runnerOutcomes,
}));
vi.mock('@/features/attempts/hooks/useAttemptRunner', () => ({
  useAttemptRunner: () => useAttemptRunnerMock(),
}));

vi.mock('@/lib/forms/useToast', () => ({
  useToast: () => ({ push: vi.fn(), dismiss: vi.fn() }),
}));

// `AttemptRunner` lives in the same barrel as `AttemptRunnerPage`
// which imports `useQuizByIdOrSlug`. Mock it so module resolution
// for that wrapper stays in spec scope.
vi.mock('@/features/quizzes/hooks/useQuizByIdOrSlug', () => ({
  useQuizByIdOrSlug: () => ({
    quiz: null,
    notFound: false,
    isLoading: false,
    error: null,
    retry: vi.fn(async () => undefined),
    isRetrying: false,
  }),
}));
vi.mock('@/features/attempts/hooks/useActiveAttempt', () => ({
  useActiveAttempt: () => ({
    attempt: null,
    isLoading: false,
    error: null,
    retry: vi.fn(async () => undefined),
  }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

const baseProps = {
  quizId: 'quiz-1',
  quizVersionId: 'version-1',
  idOrSlug: 'my-quiz',
  questions: [] as readonly never[],
};

describe('AttemptRunner — terminal branches', () => {
  it('renders the abandoned terminal state', () => {
    Object.assign(runnerOutcomes, { status: 'abandoned', activeAttempt: null });
    render(<AttemptRunner {...baseProps} />);
    expect(screen.getByTestId('attempt-runner-abandoned')).toBeInTheDocument();
  });

  it('renders the completed placeholder for the Story 4.15 handoff', () => {
    Object.assign(runnerOutcomes, { status: 'completed', activeAttempt: null });
    render(<AttemptRunner {...baseProps} />);
    expect(screen.getByTestId('attempt-runner-completed')).toBeInTheDocument();
  });
});

describe('AttemptRunner — invariant', () => {
  it('does not import completion / review / analytics services', () => {
    const source = AttemptRunner.toString();
    expect(source).not.toMatch(/completeAttempt|getAttemptReview|getAttemptAnalytics/);
  });
});