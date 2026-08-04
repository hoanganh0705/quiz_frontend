/**
 * `AttemptStartCta.spec.tsx` — locks the Start CTA + reconciliation.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.22.
 */

import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen } from '@testing-library/react';

import { AttemptStartCta } from '@/features/attempts/components/AttemptStartCta';

const routerPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: routerPush, replace: vi.fn() }),
}));

const authBootstrap = {
  state: 'authenticated' as 'authenticated' | 'unauthenticated' | 'bootstrapping',
};
vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: () => ({
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

vi.mock('@/lib/forms/useToast', () => ({
  useToast: () => ({ push: vi.fn(), dismiss: vi.fn() }),
}));

// ─── Tests ───────────────────────────────────────────────────────────────────

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
});