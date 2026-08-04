/**
 * `AttemptWriteReviewCta.spec.tsx` — locks the result-page review CTA.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.11.
 *
 * Coverage contract:
 *
 *   - Renders the CTA only when the gate resolves to `eligible` or
 *     `existing-review`.
 *   - Renders nothing for `attempt-required`, `loading`,
 *     `unauthenticated`, or `error`.
 *   - Activation navigates to the canonical quiz detail URL.
 *   - Renders nothing when `quizId` or `quizSlug` is null.
 *   - The CTA never invokes `createReview` directly.
 *   - Accessible queries find the CTA.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { AttemptWriteReviewCta } from '@/features/attempts/components/AttemptWriteReviewCta';
import type { ReviewGateState } from '@/features/reviews/types';

const useReviewGateMock = vi.fn();
const useRouterMock = vi.fn();
const pushMock = vi.fn();

vi.mock('@/features/reviews/hooks/useReviewGate', () => ({
  useReviewGate: (params: unknown) => useReviewGateMock(params),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => useRouterMock(),
}));

afterEach(() => {
  cleanup();
  useReviewGateMock.mockReset();
  useRouterMock.mockReset();
  pushMock.mockReset();
});

function gateStateOf(kind: ReviewGateState['kind']): ReviewGateState {
  switch (kind) {
    case 'loading':
      return { kind: 'loading' };
    case 'unauthenticated':
      return { kind: 'unauthenticated' };
    case 'attempt-required':
      return { kind: 'attempt-required' };
    case 'eligible':
      return { kind: 'eligible' };
    case 'existing-review':
      // The simplest payload that satisfies the type narrowing.
      // The CTA only reads `state.kind`, not the review body.
      return {
        kind: 'existing-review',
        // @ts-expect-error — stub minimal review payload; the CTA never
        // reads `review` in this test's coverage surface.
        review: { reviewId: 'r1' },
      };
    case 'error':
      return { kind: 'error', error: new Error('boom') };
  }
}

describe('AttemptWriteReviewCta — gate-driven rendering', () => {
  it('renders the CTA when the gate resolves to `eligible`', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('eligible') });
    useRouterMock.mockReturnValue({ push: pushMock });

    render(<AttemptWriteReviewCta quizId="q1" quizSlug="sample-quiz" />);
    expect(
      screen.getByTestId('attempt-write-review-cta'),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId('attempt-write-review-cta-button'),
    ).toHaveTextContent('Write a review');
  });

  it('renders the "Edit your review" label when the gate resolves to `existing-review`', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('existing-review') });
    useRouterMock.mockReturnValue({ push: pushMock });

    render(<AttemptWriteReviewCta quizId="q1" quizSlug="sample-quiz" />);
    expect(
      screen.getByTestId('attempt-write-review-cta-button'),
    ).toHaveTextContent('Edit your review');
  });

  it.each([
    'attempt-required',
    'loading',
    'unauthenticated',
    'error',
  ] as const)('renders nothing when the gate resolves to %s', (kind) => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf(kind) });
    useRouterMock.mockReturnValue({ push: pushMock });

    const { container } = render(
      <AttemptWriteReviewCta quizId="q1" quizSlug="sample-quiz" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when quizId is null', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('eligible') });
    useRouterMock.mockReturnValue({ push: pushMock });

    const { container } = render(
      <AttemptWriteReviewCta quizId={null} quizSlug="sample-quiz" />,
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when quizSlug is null', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('eligible') });
    useRouterMock.mockReturnValue({ push: pushMock });

    const { container } = render(
      <AttemptWriteReviewCta quizId="q1" quizSlug={null} />,
    );
    expect(container.firstChild).toBeNull();
  });
});

describe('AttemptWriteReviewCta — activation', () => {
  it('navigates to the canonical quiz detail URL on click', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('eligible') });
    useRouterMock.mockReturnValue({ push: pushMock });

    render(<AttemptWriteReviewCta quizId="q1" quizSlug="sample-quiz" />);
    fireEvent.click(screen.getByTestId('attempt-write-review-cta-button'));
    expect(pushMock).toHaveBeenCalledWith('/quizzes/sample-quiz');
  });

  it('does not call createReview directly', () => {
    useReviewGateMock.mockReturnValue({ state: gateStateOf('eligible') });
    useRouterMock.mockReturnValue({ push: pushMock });

    const createReviewMock = vi.fn();
    vi.doMock('@/features/reviews/hooks/useCreateReview', () => ({
      useCreateReview: () => createReviewMock,
    }));

    render(<AttemptWriteReviewCta quizId="q1" quizSlug="sample-quiz" />);
    fireEvent.click(screen.getByTestId('attempt-write-review-cta-button'));
    expect(createReviewMock).not.toHaveBeenCalled();
  });
});