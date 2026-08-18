

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
useBookmarkedQuizIds: vi.fn(),
bookmarkedQuizIdsKey: vi.fn(() => ['bookmarked-quiz-ids']),
}));

vi.mock('@/features/bookmarks/hooks/use-bookmarked-quiz-ids', async () => {
const actual = await vi.importActual<
typeof import('@/features/bookmarks/hooks/use-bookmarked-quiz-ids')
  >('@/features/bookmarks/hooks/use-bookmarked-quiz-ids');
return {
...actual,
useBookmarkedQuizIds: () => mocks.useBookmarkedQuizIds(),

bookmarkedQuizIdsKey: () => mocks.bookmarkedQuizIdsKey(),
  };
});

import { BookmarksLookupHydrator } from '@/features/bookmarks/components/BookmarksLookupHydrator';

const DEFAULT_MEMBERSHIP_RETURN = {
quizIds: new Set<string>(),
isLoading: false,
error: null,
mutate: async (): Promise<unknown> => {
return;
  },
};

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('<BookmarksLookupHydrator />', () => {
it('(a1) renders `null` and invokes useBookmarkedQuizIds on the first render', () => {
mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

const { container } = render(<BookmarksLookupHydrator />);

expect(container).toBeEmptyDOMElement();
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);
  });

it('(a2) is safe to compose with other sibling components in the same tree', () => {
mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

const { container } = render(
<div data-testid='parent'>
<BookmarksLookupHydrator />
<span data-testid='sibling'>hello</span>
</div>,
    );

expect(container).toBeInTheDocument();
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

expect(container.querySelector('[data-testid="sibling"]')).not.toBeNull();
  });

it('(a3) does not propagate the membership result — it is purely a hydration hook caller', () => {

mocks.useBookmarkedQuizIds.mockReturnValue({
...DEFAULT_MEMBERSHIP_RETURN,
quizIds: new Set<string>([
'0192f4d8-0000-7000-8000-000000000001',
'0192f4d8-0000-7000-8000-000000000002',
'0192f4d8-0000-7000-8000-000000000003',
      ]),
    });

const { container } = render(<BookmarksLookupHydrator />);

expect(container).toBeEmptyDOMElement();
  });
});

describe('<BookmarksLookupHydrator /> — hydration', () => {
it('(b) calls useBookmarkedQuizIds exactly once per mount (not twice in Strict Mode)', () => {

mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

render(<BookmarksLookupHydrator />);
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

cleanup();
mocks.useBookmarkedQuizIds.mockClear();

const { container } = render(
<>
<BookmarksLookupHydrator />
<BookmarksLookupHydrator />
</>,
    );

expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);
expect(container.querySelector('[data-testid="bookmark-button-slot"]')).toBeNull();
  });

it('(c) treats authentication transitions as a hook-responsibility — the hydrator does not gate auth', () => {

mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);

const { rerender } = render(<BookmarksLookupHydrator />);
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

rerender(<BookmarksLookupHydrator />);
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);
  });

it('(e) does not introduce any extra HTTP call beyond what the hook itself fires', () => {

mocks.useBookmarkedQuizIds.mockReturnValue({
...DEFAULT_MEMBERSHIP_RETURN,
isLoading: true,
    });

expect(() => render(<BookmarksLookupHydrator />)).not.toThrow();
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);
  });
});

describe('<BookmarksLookupHydrator /> — rerender', () => {
it('re-invokes the hook on rerender (the parent controls hydration lifetime)', () => {
mocks.useBookmarkedQuizIds.mockReturnValue(DEFAULT_MEMBERSHIP_RETURN);
const { rerender } = render(
<BookmarksLookupHydrator />,
    );
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(1);

rerender(<BookmarksLookupHydrator />);
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(2);

rerender(<BookmarksLookupHydrator />);
expect(mocks.useBookmarkedQuizIds).toHaveBeenCalledTimes(3);
  });

it('does not consume any return value from the hook (null render is unconditional)', () => {

const states: Array<ReturnType<typeof mocks.useBookmarkedQuizIds>> = [
{
quizIds: new Set<string>(),
isLoading: false,
error: null,
mutate: async () => {},
      },
{
quizIds: new Set<string>(['id-a', 'id-b']),
isLoading: true,
error: null,
mutate: async () => {},
      },
{
quizIds: new Set<string>(['id-c']),
isLoading: false,
error: { status: 500, message: 'x' } as unknown as null,
mutate: async () => {},
      },
    ];

for (const state of states) {
cleanup();
mocks.useBookmarkedQuizIds.mockReturnValue(state);
const { container } = render(<BookmarksLookupHydrator />);
expect(container).toBeEmptyDOMElement();
    }
expect(mocks.useBookmarkedQuizIds.mock.calls.length).toBeGreaterThanOrEqual(
states.length,
    );
  });
});
