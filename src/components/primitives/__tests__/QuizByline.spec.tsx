

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

const img = screen.getByRole('img', { name: /alice's avatar/i });
expect(img).toHaveAttribute('src', 'https://example.test/avatar.jpg');

expect(screen.getByText('alice')).toBeInTheDocument();
  });

it('(C2 AC #1) renders initials fallback when avatarUrl is null', () => {
const author: PublicAuthorSummary = {
userId: 'user-2',
handle: 'bob',
avatarUrl: null,
    };

render(<QuizByline author={author} />);

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

expect(within(byline).getByText('Anonymous')).toBeInTheDocument();

expect(
within(byline).queryByRole('link', { name: /profile/i }),
    ).toBeNull();
expect(byline.querySelector('a')).toBeNull();

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

render(
<QuizByline
author={author}

email='carol@example.com'
role='admin'
isAuthenticated
      />,
    );

const html = screen.getByTestId('quiz-byline').outerHTML;
expect(html).not.toContain('carol@example.com');
expect(html).not.toContain('admin');
expect(html).not.toContain('isAuthenticated');
expect(html).toContain('carol');
  });
});
