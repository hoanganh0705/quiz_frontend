

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import {
BookmarkButton,
type BookmarkButtonProps,
} from '@/components/primitives/BookmarkButton';
import type { BookmarkMutationErrorState } from '@/features/bookmarks/utils';

afterEach(() => {
cleanup();
});

function makeErrorState(
kind: BookmarkMutationErrorState['kind'],
): BookmarkMutationErrorState {
switch (kind) {
case 'ok':
case 'setup-prompt':
return {
kind,
title: null,
body: null,
retryable: false,
invalidateCache: false,
      };
case 'collection-unavailable':
return {
kind,
title: 'Collection unavailable',
body: 'Your collection is unavailable. Please refresh to sync your bookmarks.',
retryable: false,
invalidateCache: true,
      };
case 'rate-limited':
return {
kind,
title: 'Slow down',
body: 'Slow down — try again in a minute.',
retryable: false,
invalidateCache: false,
      };
case 'retryable':
return {
kind,
title: "Couldn't update bookmark",
body: "We couldn't update your bookmark. Please try again.",
retryable: true,
invalidateCache: false,
      };
case 'session-expired':
return {
kind,
title: 'Session expired',
body: 'Your session has expired. Please sign in again to continue.',
retryable: false,
invalidateCache: false,
      };
case 'generic':
return {
kind,
title: "Couldn't update bookmark",
body: "Couldn't update — try again.",
retryable: false,
invalidateCache: false,
      };
  }
}

function renderPrimitive(props: Partial<BookmarkButtonProps>) {
return render(
<BookmarkButton
isBookmarked={false}
isLoading={false}
isAuthenticated
isPending={false}
errorState={null}
onToggle={vi.fn()}
{...props}
    />,
  );
}

describe('<BookmarkButton /> — bookmarked', () => {
it('(a1) renders the bookmarked test id with aria-pressed=true', () => {
renderPrimitive({ isBookmarked: true });
const button = screen.getByTestId('bookmark-button-bookmarked');
expect(button).toHaveAttribute('aria-pressed', 'true');
expect(button).not.toBeDisabled();
expect(button).toHaveAttribute('aria-label', 'Remove bookmark');
  });

it('(a2) renders the not-bookmarked test id with aria-pressed=false', () => {
renderPrimitive({ isBookmarked: false });
const button = screen.getByTestId('bookmark-button-not-bookmarked');
expect(button).toHaveAttribute('aria-pressed', 'false');
expect(button).toHaveAttribute('aria-label', 'Add bookmark');
  });
});

describe('<BookmarkButton /> — unauthenticated', () => {
it('(b1) renders the sign-in tooltip test id with title and aria-describedby', () => {
renderPrimitive({ isAuthenticated: false });
const button = screen.getByTestId('bookmark-button-signin-tooltip');
expect(button).toBeDisabled();
expect(button).toHaveAttribute('aria-disabled', 'true');
expect(button).toHaveAttribute('title', 'Sign in to bookmark');
expect(button).toHaveAttribute(
'aria-describedby',
'bookmark-button-signin-tooltip-description',
    );
const description = screen.getByTestId(
'bookmark-button-signin-tooltip-description',
    );
expect(description).toHaveTextContent('Sign in to bookmark');
  });

it('(b2) clicking the unauthenticated button does NOT call onToggle', () => {
const onToggle = vi.fn();
renderPrimitive({ isAuthenticated: false, onToggle });
const button = screen.getByTestId('bookmark-button-signin-tooltip');
fireEvent.click(button);
expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('<BookmarkButton /> — loading', () => {
it('(c1) renders the loading test id and is non-clickable', () => {
renderPrimitive({ isLoading: true });
const button = screen.getByTestId('bookmark-button-loading');
expect(button).toBeDisabled();

const icon = button.querySelector('svg');
const iconClass =
icon?.getAttribute('class') ??
(icon as unknown as { className?: { baseVal?: string } })?.className?.baseVal ??
'';
expect(iconClass).toContain('animate-pulse');
  });

it('(c2) clicking the loading button does NOT call onToggle', () => {
const onToggle = vi.fn();
renderPrimitive({ isLoading: true, onToggle });
const button = screen.getByTestId('bookmark-button-loading');
fireEvent.click(button);
expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('<BookmarkButton /> — pending', () => {
it('(d1) pending bookmarked renders the bookmarked id with aria-busy=true', () => {
renderPrimitive({ isBookmarked: true, isPending: true });
const button = screen.getByTestId('bookmark-button-bookmarked');
expect(button).toBeDisabled();
expect(button).toHaveAttribute('aria-busy', 'true');
expect(button).toHaveAttribute('aria-pressed', 'true');
  });

it('(d2) pending unbookmarked renders the not-bookmarked id with aria-busy=true', () => {
renderPrimitive({ isBookmarked: false, isPending: true });
const button = screen.getByTestId('bookmark-button-not-bookmarked');
expect(button).toBeDisabled();
expect(button).toHaveAttribute('aria-busy', 'true');
expect(button).toHaveAttribute('aria-pressed', 'false');
  });

it('(d3) clicking the pending button does NOT call onToggle', () => {
const onToggle = vi.fn();
renderPrimitive({ isBookmarked: false, isPending: true, onToggle });
const button = screen.getByTestId('bookmark-button-not-bookmarked');
fireEvent.click(button);
expect(onToggle).not.toHaveBeenCalled();
  });
});

describe('<BookmarkButton /> — variant semantics', () => {
it('(e1) icon variant has aria-label and no visible text', () => {
renderPrimitive({ variant: 'icon', isBookmarked: true });
const button = screen.getByTestId('bookmark-button-bookmarked');
expect(button).toHaveAttribute('aria-label', 'Remove bookmark');

expect(button.textContent?.trim()).toBe('');
  });

it('(e2) iconWithLabel variant has visible label, no aria-label', () => {
renderPrimitive({ variant: 'iconWithLabel', isBookmarked: true });
const button = screen.getByTestId('bookmark-button-bookmarked');
expect(button.textContent).toContain('Bookmarked');
expect(button).not.toHaveAttribute('aria-label');
  });

it('(e3) iconWithLabel unauthenticated renders the disabled label', () => {
renderPrimitive({
variant: 'iconWithLabel',
isAuthenticated: false,
    });
const button = screen.getByTestId('bookmark-button-signin-tooltip');
expect(button.textContent).toContain('Bookmark');
expect(button).toBeDisabled();
  });

it('(e4) resolved iconWithLabel click fires onToggle exactly once', () => {
const onToggle = vi.fn();
renderPrimitive({
variant: 'iconWithLabel',
isBookmarked: false,
onToggle,
    });
const button = screen.getByTestId('bookmark-button-not-bookmarked');
fireEvent.click(button);
expect(onToggle).toHaveBeenCalledTimes(1);
  });
});

describe('<BookmarkButton /> — inline error notice', () => {
it.each([
['collection-unavailable', 'Collection unavailable'],
['rate-limited', 'Slow down'],
['retryable', "Couldn't update bookmark"],
['session-expired', 'Session expired'],
['generic', "Couldn't update bookmark"],
  ] as const)('(g) renders %s notice with title %s', (kind, expectedTitle) => {
renderPrimitive({ errorState: makeErrorState(kind) });
const notice = screen.getByTestId(`bookmark-error-notice-${kind}`);
expect(notice).toHaveTextContent(expectedTitle);
expect(notice).toHaveAttribute('role', 'status');
expect(notice).toHaveAttribute('aria-live', 'polite');
  });

it('(g-setup-prompt) does NOT render an inline notice for setup-prompt kind', () => {
renderPrimitive({ errorState: makeErrorState('setup-prompt') });
expect(
screen.queryByTestId('bookmark-error-notice-setup-prompt'),
    ).toBeNull();
  });

it('(g-ok) does NOT render an inline notice for ok kind', () => {
renderPrimitive({ errorState: makeErrorState('ok') });
expect(screen.queryByTestId('bookmark-error-notice-ok')).toBeNull();
  });

it('(g-null) does NOT render an inline notice when errorState is null', () => {
renderPrimitive({ errorState: null });
expect(screen.queryByText("Couldn't update bookmark")).toBeNull();
  });
});

describe('<BookmarkButton /> — keyboard', () => {
it('(h) the resolved button accepts keyboard activation', () => {
const onToggle = vi.fn();
renderPrimitive({ isBookmarked: false, onToggle });
const button = screen.getByTestId('bookmark-button-not-bookmarked');

button.focus();
fireEvent.keyDown(button, { key: 'Enter', code: 'Enter' });

expect(button).not.toBeDisabled();
expect(onToggle).not.toHaveBeenCalled();
  });
});