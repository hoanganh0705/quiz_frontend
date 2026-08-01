/**
 * `QuizByline.spec.tsx` — locks the C2 byline contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C2.
 *
 * Four cases per the ticket AC #1–4:
 *
 *   (C2 AC #1) Present author renders handle and avatar using
 *   only public summary fields.
 *   (C2 AC #2) Missing/deleted author renders exactly
 *   `Anonymous` with no broken image and no profile link.
 *   (C2 AC #3) No email, role, settings, auth state, or other
 *   private profile field is accepted in props or rendered.
 *   (C2 AC #4) Avatar alt text and byline link have accessible
 *   names.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

import {
  QuizByline,
  type PublicAuthorSummary,
} from '@/features/quizzes/components/QuizByline';

vi.mock('next/link', () => ({
  default: ({
    href,
    children,
    ...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    href: string;
    children: React.ReactNode;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}));

afterEach(() => {
  cleanup();
});

describe('QuizByline — present author', () => {
  it('(C2 AC #1, #4) renders handle and avatar with accessible name when an avatar URL is provided', () => {
    const author: PublicAuthorSummary = {
      userId: 'user-1',
      handle: 'alice',
      avatarUrl: 'https://example.test/avatar.jpg',
    };

    render(<QuizByline author={author} />);

    const link = screen.getByTestId('quiz-byline');
    expect(link).toHaveAttribute('data-author-state', 'present');
    expect(link).toHaveAttribute('data-author-id', 'user-1');
    expect(link).toHaveAttribute('href', '/users/user-1');
    expect(link).toHaveAccessibleName(/view alice's public profile/i);

    // The avatar image is reachable by its accessible name
    // (alt text) and carries the expected src.
    const img = screen.getByRole('img', { name: /alice's avatar/i });
    expect(img).toHaveAttribute('src', 'https://example.test/avatar.jpg');

    // Handle is rendered.
    expect(screen.getByText('alice')).toBeInTheDocument();
  });

  it('(C2 AC #1) renders initials fallback when avatarUrl is null', () => {
    const author: PublicAuthorSummary = {
      userId: 'user-2',
      handle: 'bob',
      avatarUrl: null,
    };

    render(<QuizByline author={author} />);

    // No <img> in the tree because no remote avatar URL was
    // supplied. The initials "B" are rendered in the fallback
    // slot.
    expect(screen.queryByRole('img')).toBeNull();
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('bob')).toBeInTheDocument();
  });
});

describe('QuizByline — missing author', () => {
  it('(C2 AC #2) renders exactly "Anonymous" with no profile link and no <img>', () => {
    render(<QuizByline author={null} />);

    const byline = screen.getByTestId('quiz-byline');
    expect(byline).toHaveAttribute('data-author-state', 'anonymous');
    expect(byline.tagName.toLowerCase()).toBe('p');

    // The literal "Anonymous" is rendered as a child element,
    // not as part of the byline container, so other components
    // can target it for assertions.
    expect(within(byline).getByText('Anonymous')).toBeInTheDocument();

    // No link to a profile.
    expect(
      within(byline).queryByRole('link', { name: /profile/i }),
    ).toBeNull();
    expect(byline.querySelector('a')).toBeNull();

    // No remote avatar request.
    expect(within(byline).queryByRole('img')).toBeNull();
  });
});

describe('QuizByline — privacy boundary', () => {
  it('(C2 AC #3) does not render any private profile field', () => {
    const author: PublicAuthorSummary = {
      userId: 'user-3',
      handle: 'carol',
      avatarUrl: null,
    };

    // Pass the private fields as extra props at runtime. The
    // component type rejects them at compile time, but the
    // test confirms they are ignored even if forced at runtime.
    render(
      <QuizByline
        author={author}
        // @ts-expect-error — intentionally passing forbidden
        // private props at runtime to prove they are ignored.
        email='carol@example.com'
        role='admin'
        isAuthenticated
      />,
    );

    // The DOM should contain only the public handle.
    const html = screen.getByTestId('quiz-byline').outerHTML;
    expect(html).not.toContain('carol@example.com');
    expect(html).not.toContain('admin');
    expect(html).not.toContain('isAuthenticated');
    expect(html).toContain('carol');
  });
});
