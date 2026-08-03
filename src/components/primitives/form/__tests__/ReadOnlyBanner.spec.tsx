/**
 * `<ReadOnlyBanner />` unit tests.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source ticket: TKT-4.2.E1.
 *
 * Coverage contract (from the ticket acceptance list):
 *
 *   (a) The banner renders the documented copy ("This quiz is no
 *       longer editable") when mounted.
 *   (b) When `reason` is supplied, the banner surfaces the reason on
 *       the lock-icon `title` attribute (the tooltip).
 *   (c) When `reason` is supplied, the banner renders a `<span>` with
 *       the `reason: <reason>` text for accessibility.
 *   (d) When `reason` is absent, the banner omits the reason `<span>`.
 *   (e) The `data-read-only-banner-reason` attribute mirrors the
 *       `reason` prop (or `'unknown'` when absent).
 *   (f) The `testId` prop is honoured.
 */

import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { ReadOnlyBanner } from '../ReadOnlyBanner';

describe('<ReadOnlyBanner />', () => {
  it('(a) renders the documented copy when mounted', () => {
    render(<ReadOnlyBanner />);
    expect(screen.getByTestId('read-only-banner')).toBeInTheDocument();
    expect(screen.getByTestId('read-only-banner-title')).toHaveTextContent(
      'This quiz is no longer editable'
    );
  });

  it('(b) renders the reason as a tooltip on the lock icon', () => {
    render(<ReadOnlyBanner reason='quiz-deleted' />);
    const lock = screen.getByTestId('read-only-banner-lock');
    expect(lock).toBeInTheDocument();
    expect(lock).toHaveAttribute('title', 'This quiz is no longer editable (quiz-deleted).');
  });

  it('(c) renders a reason <span> when reason is supplied', () => {
    render(<ReadOnlyBanner reason='quiz-archived' />);
    expect(screen.getByTestId('read-only-banner-reason')).toHaveTextContent(
      'reason: quiz-archived'
    );
  });

  it('(d) omits the reason <span> when reason is absent', () => {
    render(<ReadOnlyBanner />);
    expect(
      screen.queryByTestId('read-only-banner-reason')
    ).not.toBeInTheDocument();
  });

  it('(e) mirrors the reason on the data-read-only-banner-reason attribute', () => {
    const { rerender } = render(<ReadOnlyBanner reason='version-immutable' />);
    expect(screen.getByTestId('read-only-banner')).toHaveAttribute(
      'data-read-only-banner-reason',
      'version-immutable'
    );
    rerender(<ReadOnlyBanner />);
    expect(screen.getByTestId('read-only-banner')).toHaveAttribute(
      'data-read-only-banner-reason',
      'unknown'
    );
  });

  it('(f) honours the testId prop', () => {
    render(<ReadOnlyBanner testId='my-test-id' />);
    expect(screen.getByTestId('my-test-id')).toBeInTheDocument();
    // The default sub-testids remain scoped to the original root so
    // consumers can override per-form without colliding.
    expect(screen.getByTestId('my-test-id-title')).toBeInTheDocument();
  });

  it('uses role="status" and aria-live="polite" for accessibility', () => {
    render(<ReadOnlyBanner />);
    const banner = screen.getByTestId('read-only-banner');
    expect(banner).toHaveAttribute('role', 'status');
    expect(banner).toHaveAttribute('aria-live', 'polite');
  });
});
