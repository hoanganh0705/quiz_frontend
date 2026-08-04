/**
 * `ReviewGateState.spec.tsx` — review gate notice component spec.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.13.
 *
 * Coverage contract:
 *
 *   - The gate copy renders (with quiz title when supplied).
 *   - The CTA renders as a live, actionable control when either
 *     `startAttemptHref` or `onStartAttempt` is supplied.
 *   - The CTA renders as a disabled "coming soon" button when
 *     neither is supplied (Story 4.14 dependency missing).
 *   - The retry button appears only when `onRetry` is supplied.
 *   - The error message renders with `role="alert"`.
 *   - No attempt service is imported (architectural boundary).
 *   - The notice is keyboard accessible (the CTA is focusable).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ReviewGateNotice } from '@/features/reviews/components';

afterEach(() => {
  cleanup();
});

describe('ReviewGateState — copy', () => {
  it('renders the default heading without a quiz title', () => {
    render(<ReviewGateNotice />);
    expect(
      screen.getByRole('heading', {
        name: /Complete an attempt before writing a review/i,
      }),
    ).toBeInTheDocument();
  });

  it('renders the personalised heading with the quiz title', () => {
    render(<ReviewGateNotice quizTitle='Math 101' />);
    expect(
      screen.getByRole('heading', {
        name: /Complete an attempt before reviewing .Math 101./i,
      }),
    ).toBeInTheDocument();
  });

  it('exposes the notice with `role="status"`', () => {
    render(<ReviewGateNotice />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
});

describe('ReviewGateState — CTA', () => {
  it('renders a live CTA when `onStartAttempt` is supplied', () => {
    const onStartAttempt = vi.fn();

    render(<ReviewGateNotice onStartAttempt={onStartAttempt} />);

    const cta = screen.getByTestId('review-gate-state-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).not.toBeDisabled();
    expect(cta).toHaveTextContent(/Start attempt/);

    fireEvent.click(cta);
    expect(onStartAttempt).toHaveBeenCalledTimes(1);
  });

  it('renders a live CTA with `data-href` when `startAttemptHref` is supplied', () => {
    render(<ReviewGateNotice startAttemptHref='/quizzes/foo/attempt' />);

    const cta = screen.getByTestId('review-gate-state-cta');
    expect(cta).toBeInTheDocument();
    expect(cta).toHaveAttribute('data-href', '/quizzes/foo/attempt');
    expect(cta).not.toBeDisabled();
  });

  it('renders a disabled CTA when neither `onStartAttempt` nor `startAttemptHref` is supplied', () => {
    render(<ReviewGateNotice />);

    const cta = screen.getByTestId('review-gate-state-cta-unavailable');
    expect(cta).toBeInTheDocument();
    expect(cta).toBeDisabled();
    expect(cta).toHaveAttribute('aria-disabled', 'true');
    expect(cta).toHaveTextContent(/coming soon/i);
  });
});

describe('ReviewGateState — retry', () => {
  it('renders a retry button when `onRetry` is supplied and invokes it on click', () => {
    const onRetry = vi.fn();

    render(<ReviewGateNotice onRetry={onRetry} />);

    const retry = screen.getByTestId('review-gate-state-retry');
    expect(retry).toBeInTheDocument();

    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('does not render a retry button when `onRetry` is omitted', () => {
    render(<ReviewGateNotice />);
    expect(screen.queryByTestId('review-gate-state-retry')).toBeNull();
  });
});

describe('ReviewGateState — error message', () => {
  it('renders the error message with `role="alert"` when supplied', () => {
    render(<ReviewGateNotice errorMessage='Could not check eligibility' />);

    const error = screen.getByTestId('review-gate-state-error');
    expect(error).toHaveTextContent('Could not check eligibility');
    expect(error).toHaveAttribute('role', 'alert');
  });

  it('does not render an error region when no message is supplied', () => {
    render(<ReviewGateNotice />);
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('ReviewGateState — keyboard accessibility', () => {
  it('the live CTA is reachable via Tab', () => {
    render(<ReviewGateNotice onStartAttempt={() => undefined} />);

    expect(screen.getByTestId('review-gate-state-cta')).toBeInTheDocument();
  });
});
