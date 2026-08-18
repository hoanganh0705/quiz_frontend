

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { BookmarkButtonSlot } from '@/components/primitives/BookmarkButton';

const mutateMock = vi.fn();
vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

const addBookmarkMock = vi.fn();
const removeBookmarkMock = vi.fn();
const getBookmarkStatusMock = vi.fn();
const listCollectionsMock = vi.fn();
const listBookmarksInCollectionMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
addBookmark: (...args: unknown[]) => addBookmarkMock(...args),
removeBookmark: (...args: unknown[]) => removeBookmarkMock(...args),
getBookmarkStatus: (...args: unknown[]) => getBookmarkStatusMock(...args),
listCollections: (...args: unknown[]) => listCollectionsMock(...args),
listBookmarksInCollection: (...args: unknown[]) =>
listBookmarksInCollectionMock(...args),
}));

const useAuthStateMock = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-state', () => ({
useAuthState: () => useAuthStateMock(),
}));

function uuidV7(index: number): string {
const tail = String(index).padStart(12, '0');
return `0192f4d8-0000-7000-8000-${tail}`;
}

const TARGET_COLLECTION_ID = uuidV7(1);
const QUIZ_ID = uuidV7(7);

function makeApiError(status: number, code: string): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}`,
code,
config: undefined,
request: undefined,
response: {
status,
data: {
type: 'about:blank',
title: `Error ${status}`,
status,
code,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function favouriteCollection() {
return {
collectionId: TARGET_COLLECTION_ID,
userId: uuidV7(2),
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

function flushMicrotasks(): Promise<void> {
return new Promise<void>((resolve) => {
setTimeout(resolve, 0);
  });
}

beforeEach(() => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
listCollectionsMock.mockResolvedValue({
data: { items: [favouriteCollection()] },
  });
getBookmarkStatusMock.mockResolvedValue({
data: {
bookmarked: false,
collections: [],
    },
  });
addBookmarkMock.mockResolvedValue({ data: undefined });
removeBookmarkMock.mockResolvedValue({ data: undefined });
listBookmarksInCollectionMock.mockResolvedValue({
data: { items: [] },
  });
});

afterEach(() => {
cleanup();
vi.resetAllMocks();
});

async function waitForHydration(
container: HTMLElement,
opts: { requireDefaultCollection?: boolean } = {},
) {
await waitFor(
() => {
const el = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
      ) as HTMLElement | null;
if (!el) throw new Error('slot not rendered');

if (el.getAttribute('data-default-collection-loading') === 'true') {
throw new Error('default collection still loading');
      }

if (
opts.requireDefaultCollection !== false &&
!el.getAttribute('data-default-collection-id')
      ) {
throw new Error('default collection not hydrated');
      }
    },
{ timeout: 1000 },
  );
}

describe('<BookmarkButtonSlot /> — membership-driven rendering', () => {
it('(a1) renders the unbookmarked branch when the membership Set does not include the quizId', async () => {

const slot = <BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />;
const { container } = render(slot, { wrapper: TestSwrProvider });
await waitForHydration(container);
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
expect(slotEl.getAttribute('data-bookmarked')).toBe('false');
const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    );
expect(button).toBeInTheDocument();
  });

it('(a2) renders the bookmarked branch when the membership Set contains the quizId', async () => {

listBookmarksInCollectionMock.mockReset();
listBookmarksInCollectionMock.mockResolvedValue({
data: {
items: [
{
bookmarkId: uuidV7(99),
quizId: QUIZ_ID,
quizTitle: 'Quiz',
quizSlug: 'quiz',
quizImageUrl: null,
quizIsFeatured: false,
notes: null,
bookmarkedAt: '2026-07-01T00:00:00.000Z',
collectionId: TARGET_COLLECTION_ID,
          },
        ],
      },
    });
const slot = <BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />;
const { container } = render(slot, { wrapper: TestSwrProvider });
await waitFor(
() => {
const el = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
        ) as HTMLElement | null;
if (!el) throw new Error('slot missing');
if (el.getAttribute('data-bookmarked') !== 'true') {
throw new Error('not yet bookmarked');
        }
      },
{ timeout: 1000 },
    );
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
const button = slotEl.querySelector(
'[data-testid="bookmark-button-bookmarked"]',
    );
expect(button).toBeInTheDocument();
  });
});

describe('<BookmarkButtonSlot /> — action routing', () => {
it('(b1) an unbookmarked click invokes addBookmark (not removeBookmark)', async () => {
const { container } = render(<BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(container);
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
expect(slotEl.getAttribute('data-bookmarked')).toBe('false');

const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeInTheDocument();

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
await flushMicrotasks();
    });

await waitFor(
() => {
expect(addBookmarkMock).toHaveBeenCalled();
      },
{ timeout: 500 },
    );
expect(removeBookmarkMock).not.toHaveBeenCalled();
  });
});

describe('<BookmarkButtonSlot /> — no_collection opens setup prompt', () => {
it('(c) opens BookmarksSetupPrompt when the C1 hook returns lastOutcome.kind = no_collection', async () => {
listCollectionsMock.mockReset();
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { container } = render(
<BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />,
{ wrapper: TestSwrProvider },
    );

await waitForHydration(container, { requireDefaultCollection: false });
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;

const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeInTheDocument();

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
    });

expect(addBookmarkMock).not.toHaveBeenCalled();

await waitFor(() => {
expect(
document.querySelector('[data-testid="bookmarks-setup-prompt"]'),
      ).toBeTruthy();
    });
  });
});

describe('<BookmarkButtonSlot /> — error notice rendering', () => {
it('(d1) a 5xx produces the inline retryable notice', async () => {
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(500, 'INTERNAL_ERROR'),
    );

const { container } = render(<BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(container);
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"]',
    ) as HTMLElement;
const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
    });

await waitFor(() => {
expect(
document.querySelector('[data-testid="bookmark-error-notice-retryable"]'),
      ).toBeTruthy();
    });
  });
});

describe('<BookmarkButtonSlot /> — card variant parent-link suppression', () => {
it('(e1) the slot wrapper calls preventDefault on click so the parent <a> does not navigate', async () => {

function Parent() {
return (
<a href='/quizzes/x' data-testid='parent-link'>
<BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />
</a>
      );
    }
const { container } = render(<Parent />, { wrapper: TestSwrProvider });

await waitForHydration(container);
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeInTheDocument();

let preventDefaultCallCount = 0;
await act(async () => {

const spy = vi
        .spyOn(Event.prototype, 'preventDefault')
        .mockImplementation(function (this: Event) {
preventDefaultCallCount++;
Object.getPrototypeOf(Event.prototype).preventDefault.call(this);
        });
fireEvent.click(button, { bubbles: true });

expect(preventDefaultCallCount).toBeGreaterThanOrEqual(1);
spy.mockRestore();
await flushMicrotasks();
    });
  });
});

describe('<BookmarkButtonSlot /> — detail variant', () => {
it('(f) detail mode renders an icon-with-label button', async () => {
const { container } = render(<BookmarkButtonSlot quizId={QUIZ_ID} variant='detail' />, {
wrapper: TestSwrProvider,
    });
await waitForHydration(container);
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"]',
    ) as HTMLElement;
expect(slotEl.getAttribute('data-variant')).toBe('detail');
const button = slotEl.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button.textContent).toContain('Bookmark');
  });
});

describe('<BookmarkButtonSlot /> — unauthenticated', () => {
it('(g) renders the disabled sign-in branch and does not call addBookmark on click', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });

const { container } = render(<BookmarkButtonSlot quizId={QUIZ_ID} variant='card' />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(container, { requireDefaultCollection: false });
const slotEl = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
expect(slotEl.getAttribute('data-authenticated')).toBe('false');

const button = container.querySelector(
'[data-testid="bookmark-button-signin-tooltip"]',
    ) as HTMLButtonElement;
expect(button).toBeInTheDocument();
expect(button).toBeDisabled();

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
    });

expect(addBookmarkMock).not.toHaveBeenCalled();
expect(removeBookmarkMock).not.toHaveBeenCalled();
  });
});