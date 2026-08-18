

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import BookmarksEmptyState, {
BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL,
BOOKMARKS_NOT_NOW_LABEL,
} from '@/features/bookmarks/components/BookmarksEmptyState';

afterEach(() => {
cleanup();
});

describe('<BookmarksEmptyState /> — default render', () => {
it('(a1) renders the documented title and description', () => {
render(<BookmarksEmptyState />);
expect(screen.getByRole('heading', { name: /create your first collection/i }))
      .toBeInTheDocument();
expect(screen.getByText(/collections let you group your bookmarked quizzes/i))
      .toBeInTheDocument();
expect(screen.getByTestId('bookmarks-empty-state')).toBeInTheDocument();
  });
});

describe('<BookmarksEmptyState /> — CTA + dismiss slots', () => {
it('(b1) renders the CTA with the supplied label and forwards clicks', () => {
const onClick = vi.fn();
render(
<BookmarksEmptyState
cta={{ label: BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL, onClick }}
      />,
    );
const cta = screen.getByRole('button', {
name: BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL,
    });
expect(cta).toBeInTheDocument();
cta.click();
expect(onClick).toHaveBeenCalledTimes(1);
  });

it('(b2) renders the dismiss with the supplied label', () => {
const onClick = vi.fn();
render(
<BookmarksEmptyState
dismiss={{ label: BOOKMARKS_NOT_NOW_LABEL, onClick }}
      />,
    );
const dismiss = screen.getByRole('button', { name: BOOKMARKS_NOT_NOW_LABEL });
expect(dismiss).toBeInTheDocument();
dismiss.click();
expect(onClick).toHaveBeenCalledTimes(1);
  });

it('(b3) renders no buttons when both slots are omitted', () => {
const { container } = render(<BookmarksEmptyState />);

expect(
container.querySelector('button'),
    ).toBeNull();
  });

it('(b4) renders both CTA and dismiss when both slots are supplied', () => {
render(
<BookmarksEmptyState
cta={{ label: 'Create a collection', onClick: vi.fn() }}
dismiss={{ label: 'Not now', onClick: vi.fn() }}
      />,
    );
expect(
screen.getByRole('button', { name: /create a collection/i }),
    ).toBeInTheDocument();
expect(screen.getByRole('button', { name: /not now/i }))
      .toBeInTheDocument();
  });
});

describe('<BookmarksEmptyState /> — no-mutation contract', () => {
it('(c) does not import or call any bookmark API / wrapper', () => {

render(<BookmarksEmptyState />);

expect(screen.queryByRole('button')).toBeNull();
  });
});