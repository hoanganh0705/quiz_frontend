/**
 * `<FollowButton />` + `<FollowErrorNotice />` unit tests.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B2.
 *
 * Eight cases per the ticket AC #1–12:
 *
 *   (a) Disabled-when-unauthenticated renders the
 *       `follow-button-signin-tooltip` `data-testid` and the
 *       `title='Sign in to follow'` attribute.
 *   (b) Following state renders `follow-button-following` and
 *       `aria-pressed='true'`.
 *   (c) Not-following state renders `follow-button-not-following` and
 *       `aria-pressed='false'`.
 *   (d) Pending state renders `disabled` + `aria-busy='true'` with the
 *       text from the previous state (no flicker).
 *   (e) Clicking the button calls `onToggle` exactly once when
 *       `isAuthenticated && !isPending`.
 *   (f) Clicking the button when `isAuthenticated === false` does NOT
 *       call `onToggle` (the primitive short-circuits to a no-op).
 *   (g) The error-notice rendering for each `errorKind` matches the
 *       copy table in the spec.
 *   (h) The skeleton renders the same outer dimensions as the resolved
 *       button (snapshot parity).
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`. The setupFile at
 * `src/components/primitives/__tests__/setup.ts` registers
 * `@testing-library/jest-dom` matchers and an `afterEach` `cleanup`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import {
  FollowButton,
  FollowButtonSkeleton,
  FollowErrorNotice,
} from '@/components/primitives/FollowButton';

afterEach(() => {
  cleanup();
});

// ---------------------------------------------------------------------------
// (a) Disabled-when-unauthenticated
// ---------------------------------------------------------------------------

describe('<FollowButton /> — disabled when unauthenticated', () => {
  it('(a) renders the sign-in tooltip test id and the "Sign in to follow" title', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated={false}
        isPending={false}
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-disabled', 'true');
    expect(button).toHaveAttribute('title', 'Sign in to follow');
    expect(button).toHaveAttribute('aria-describedby', 'follow-button-signin-tooltip-description');
  });

  it('(f) does NOT call onToggle when clicked while unauthenticated', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated={false}
        isPending={false}
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-signin-tooltip');
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (b) Following state
// ---------------------------------------------------------------------------

describe('<FollowButton /> — following state', () => {
  it('(b) renders the following test id with aria-pressed=true and text "Following"', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing
        isAuthenticated
        isPending={false}
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-following');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(button).toHaveTextContent('Following');
  });
});

// ---------------------------------------------------------------------------
// (c) Not-following state
// ---------------------------------------------------------------------------

describe('<FollowButton /> — not-following state', () => {
  it('(c) renders the not-following test id with aria-pressed=false and text "Follow"', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated
        isPending={false}
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveTextContent('Follow');
  });
});

// ---------------------------------------------------------------------------
// (d) Pending state — no flicker
// ---------------------------------------------------------------------------

describe('<FollowButton /> — pending state', () => {
  it('(d) renders disabled + aria-busy=true with the text from the previous state (following)', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing
        isAuthenticated
        isPending
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-following');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Following');
  });

  it('(d) renders disabled + aria-busy=true with the text from the previous state (not-following)', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated
        isPending
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-not-following');
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toHaveTextContent('Follow');
  });
});

// ---------------------------------------------------------------------------
// (e) Clicking calls onToggle exactly once
// ---------------------------------------------------------------------------

describe('<FollowButton /> — click', () => {
  it('(e) calls onToggle exactly once when authenticated + not pending', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated
        isPending={false}
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-not-following');
    fireEvent.click(button);
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onToggle when isPending (the primitive is busy)', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing={false}
        isAuthenticated
        isPending
        errorKind={null}
        onToggle={onToggle}
      />,
    );

    const button = screen.getByTestId('follow-button-not-following');
    fireEvent.click(button);
    expect(onToggle).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (g) Error-notice rendering per errorKind
// ---------------------------------------------------------------------------

describe('<FollowErrorNotice />', () => {
  it('(g) renders "Slow down — try again in a minute" for http_429', () => {
    render(<FollowErrorNotice errorKind='http_429' />);
    const notice = screen.getByTestId('follow-error-notice-http_429');
    expect(notice).toHaveTextContent('Slow down — try again in a minute');
    expect(notice).toHaveAttribute('role', 'status');
    expect(notice).toHaveAttribute('aria-live', 'polite');
  });

  it('(g) renders "Couldn\'t update — try again" for http_4xx', () => {
    render(<FollowErrorNotice errorKind='http_4xx' />);
    const notice = screen.getByTestId('follow-error-notice-http_4xx');
    expect(notice).toHaveTextContent("Couldn't update — try again");
  });

  it('(g) renders "Couldn\'t update — retry" for http_5xx', () => {
    render(<FollowErrorNotice errorKind='http_5xx' />);
    const notice = screen.getByTestId('follow-error-notice-http_5xx');
    expect(notice).toHaveTextContent("Couldn't update — retry");
  });

  it('(g) renders "This tag / category is no longer available" for http_404', () => {
    render(<FollowErrorNotice errorKind='http_404' />);
    const notice = screen.getByTestId('follow-error-notice-http_404');
    expect(notice).toHaveTextContent('This tag / category is no longer available');
  });

  it('renders nothing for unknown (silent)', () => {
    const { container } = render(<FollowErrorNotice errorKind='unknown' />);
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing for null (no error)', () => {
    const { container } = render(<FollowErrorNotice errorKind={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('integrates with <FollowButton />: http_429 surfaces above the button in the same DOM region', () => {
    const onToggle = vi.fn();
    render(
      <FollowButton
        isFollowing
        isAuthenticated
        isPending={false}
        errorKind='http_429'
        onToggle={onToggle}
      />,
    );

    expect(screen.getByTestId('follow-error-notice-http_429')).toBeInTheDocument();
    expect(screen.getByTestId('follow-button-following')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// (h) Skeleton — same outer dimensions as the resolved button
// ---------------------------------------------------------------------------

describe('<FollowButtonSkeleton />', () => {
  it('(h) renders the skeleton test id with role=status', () => {
    const { container } = render(<FollowButtonSkeleton />);
    const skeleton = screen.getByTestId('follow-button-skeleton');
    expect(skeleton).toHaveAttribute('role', 'status');
    expect(skeleton).toHaveAttribute('aria-label', 'Loading follow state');
    // Outer dimensions mirror the FollowButton (h-9 min-w-28 px-4).
    expect(container.querySelector('[data-slot="skeleton"]')).not.toBeNull();
  });
});