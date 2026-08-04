/**
 * `ReviewHelpfulButton.spec.tsx` — helpful button component spec.
 *
 * Source epic:   Epic 4.13.
 * Source ticket: T-4.13.14.
 *
 * Coverage contract:
 *
 *   - Renders the helpful count and label.
 *   - Marked state uses `aria-pressed=true`; unmarked uses `false`.
 *   - Clicking calls `onToggle` exactly once.
 *   - Pending state blocks repeat input.
 *   - Owner receives no actionable button — only a read-only count.
 *   - Unauthenticated state has no actionable button — only a
 *     read-only count.
 *   - Error rollback (when the parent flips `viewerMarkedHelpful`
 *     back) is reflected in the rendered state.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { ReviewHelpfulButton } from '@/features/reviews/components/ReviewHelpfulButton';

afterEach(() => {
  cleanup();
});

const REVIEW_ID = 'r-1';

describe('ReviewHelpfulButton — toggle', () => {
  it('renders the count and an accessible label', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        onToggle={() => undefined}
      />,
    );

    const button = screen.getByTestId(`review-helpful-button-${REVIEW_ID}`);
    expect(button).toHaveAttribute('aria-label', 'Helpful (12)');
    expect(button).toHaveTextContent('12');
  });

  it('uses `aria-pressed=false` when unmarked', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        onToggle={() => undefined}
      />,
    );
    expect(
      screen.getByTestId(`review-helpful-button-${REVIEW_ID}`),
    ).toHaveAttribute('aria-pressed', 'false');
  });

  it('uses `aria-pressed=true` when marked', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful
        isPending={false}
        onToggle={() => undefined}
      />,
    );
    expect(
      screen.getByTestId(`review-helpful-button-${REVIEW_ID}`),
    ).toHaveAttribute('aria-pressed', 'true');
  });

  it('calls `onToggle` exactly once per click', () => {
    const onToggle = vi.fn();

    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        onToggle={onToggle}
      />,
    );

    fireEvent.click(
      screen.getByTestId(`review-helpful-button-${REVIEW_ID}`),
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('ReviewHelpfulButton — pending', () => {
  it('is disabled while pending and exposes `aria-busy`', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending
        onToggle={() => undefined}
      />,
    );

    const button = screen.getByTestId(`review-helpful-button-${REVIEW_ID}`);
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
  });

  it('blocks a click while pending', () => {
    const onToggle = vi.fn();

    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending
        onToggle={onToggle}
      />,
    );

    fireEvent.click(
      screen.getByTestId(`review-helpful-button-${REVIEW_ID}`),
    );

    expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('ReviewHelpfulButton — owner', () => {
  it('hides the toggle and renders only a read-only count when `isOwner` is true', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        isOwner
        onToggle={() => undefined}
      />,
    );

    expect(
      screen.queryByTestId(`review-helpful-button-${REVIEW_ID}`),
    ).toBeNull();
    expect(
      screen.getByTestId(`review-helpful-count-${REVIEW_ID}`),
    ).toHaveTextContent('12');
  });
});

describe('ReviewHelpfulButton — unauthenticated', () => {
  it('hides the toggle and renders only a read-only count when `isAuthenticated` is false', () => {
    render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        isAuthenticated={false}
        onToggle={() => undefined}
      />,
    );

    expect(
      screen.queryByTestId(`review-helpful-button-${REVIEW_ID}`),
    ).toBeNull();
    expect(
      screen.getByTestId(`review-helpful-count-${REVIEW_ID}`),
    ).toHaveTextContent('12');
  });
});

describe('ReviewHelpfulButton — error rollback', () => {
  it('reflects the parent-driven flip back to unmarked when the optimistic update is rolled back', () => {
    const { rerender } = render(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={13}
        viewerMarkedHelpful
        isPending
        onToggle={() => undefined}
      />,
    );

    expect(
      screen.getByTestId(`review-helpful-button-${REVIEW_ID}`),
    ).toHaveAttribute('aria-pressed', 'true');

    // The hook rolls back: viewerMarkedHelpful flips back, the
    // server-confirmed count is restored.
    rerender(
      <ReviewHelpfulButton
        reviewId={REVIEW_ID}
        helpfulCount={12}
        viewerMarkedHelpful={false}
        isPending={false}
        onToggle={() => undefined}
      />,
    );

    const button = screen.getByTestId(`review-helpful-button-${REVIEW_ID}`);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('12');
  });
});
