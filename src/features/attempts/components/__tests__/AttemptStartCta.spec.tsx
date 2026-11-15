import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { AttemptStartCta } from '@/features/attempts/components/AttemptStartCta';
import { ApiError } from '@/lib/api';

const routerPush = vi.fn();
const routerReplace = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: routerReplace }),
}));

const authBootstrap = {
  state: 'authenticated' as 'authenticated' | 'unauthenticated' | 'bootstrapping',
};
vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => ({
    bootstrapState: authBootstrap.state,
    currentUser: authBootstrap.state === 'authenticated' ? { id: 'u' } : null,
  }),
}));

const startMock = vi.fn();
const startOutcomeState: { current: unknown } = { current: null };
vi.mock('@/features/attempts/hooks/useStartAttempt', () => ({
  useStartAttempt: () => ({
    isPending: false,
    isCoolingDown: false,
    outcome: startOutcomeState.current,
    error: null,
    start: startMock,
    reset: vi.fn(),
  }),
}));

const toastPush = vi.fn();
vi.mock('@/lib/forms/useToast', () => ({
  useToast: () => ({ push: toastPush, dismiss: vi.fn() }),
}));

describe('AttemptStartCta — visibility', () => {
  it('does not render when the parent reports an active attempt', () => {
    const { container } = render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty={false}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('does not render when unauthenticated', () => {
    authBootstrap.state = 'unauthenticated';
    const { container } = render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('AttemptStartCta — click', () => {
  beforeEach(() => {
    authBootstrap.state = 'authenticated';
    startMock.mockReset();
    routerPush.mockReset();
    routerReplace.mockReset();
    toastPush.mockReset();
  });

  it('invokes the start mutation exactly once per click', async () => {
    startMock.mockResolvedValueOnce({ kind: 'idle' });
    render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-start-attempt-button'));
    });
    expect(startMock).toHaveBeenCalledTimes(1);
  });

  it('navigates to the attempt runner route on success outcome', async () => {
    startMock.mockResolvedValueOnce({ kind: 'success', attemptId: 'att-1' });
    render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="global-sports-trivia"
        isActiveResolvedEmpty
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-start-attempt-button'));
    });
    expect(routerPush).toHaveBeenCalledWith('/quizzes/global-sports-trivia/attempt');
  });

  it('shows toast and triggers onAlreadyStarted when attempt is already started', async () => {
    const onAlreadyStarted = vi.fn();
    startMock.mockResolvedValueOnce({ kind: 'already_started', attemptId: null });
    render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty
        onAlreadyStarted={onAlreadyStarted}
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-start-attempt-button'));
    });
    expect(toastPush).toHaveBeenCalledTimes(1);
    expect(onAlreadyStarted).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });

  it('shows toast and replaces route when quiz is unpublished', async () => {
    startMock.mockResolvedValueOnce({ kind: 'quiz_unpublished' });
    render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-start-attempt-button'));
    });
    expect(toastPush).toHaveBeenCalledTimes(1);
    expect(routerReplace).toHaveBeenCalledWith('/quizzes/my-quiz');
  });

  it('shows toast with error copy when outcome is retryable', async () => {
    const error = new ApiError({
      message: 'Network issue',
      status: 500,
      code: 'GLOBAL_INTERNAL_ERROR',
    });
    startMock.mockResolvedValueOnce({ kind: 'retryable', error });
    render(
      <AttemptStartCta
        quizId="quiz-1"
        idOrSlug="my-quiz"
        isActiveResolvedEmpty
      />,
    );
    await act(async () => {
      fireEvent.click(screen.getByTestId('quiz-start-attempt-button'));
    });
    expect(toastPush).toHaveBeenCalledTimes(1);
    expect(routerPush).not.toHaveBeenCalled();
  });
});
