

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import {
QUIZ_START_ATTEMPT_TOOLTIP,
QuizCtaStrip,
} from '@/features/quizzes/components/QuizCtaStrip';

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
data: { bookmarked: false, collections: [] },
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

async function waitForSlotHydration(
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

describe('<QuizCtaStrip /> — slot integration', () => {
it('renders the slot with quizId bound and the Start CTA placeholder', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);
const slot = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
expect(slot).toBeTruthy();
expect(slot.getAttribute('data-variant')).toBe('detail');

const start = screen.getByTestId('quiz-start-attempt-button');
expect(start).toBeDisabled();
  });

it('preserves the `quiz-bookmark-button` testid family — the inner D1 button still has a bookmark test id', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);

const inner = container.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    );
expect(inner).toBeTruthy();
  });

it('renders exactly one bookmark control (no duplicates)', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);

const slots = container.querySelectorAll(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    );
expect(slots.length).toBe(1);
  });
});

describe('<QuizCtaStrip /> — click paths', () => {
it('clicking an unbookmarked button invokes addBookmark', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);
const button = container.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeTruthy();

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

it('clicking an already-bookmarked button invokes removeBookmark', async () => {

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
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );

await waitFor(
() => {
const el = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
        ) as HTMLElement | null;
if (!el) throw new Error('slot not rendered');
if (el.getAttribute('data-default-collection-loading') === 'true') {
throw new Error('default collection still loading');
        }
if (el.getAttribute('data-bookmarked') !== 'true') {
throw new Error('not yet bookmarked');
        }
      },
{ timeout: 1000 },
    );
const slot = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
const button = slot.querySelector(
'[data-testid="bookmark-button-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeTruthy();

getBookmarkStatusMock.mockReset();
getBookmarkStatusMock.mockResolvedValue({
data: {
bookmarked: true,
collections: [
{
collectionId: TARGET_COLLECTION_ID,
collectionName: 'Favourites',
bookmarkedAt: '2026-07-01T00:00:00.000Z',
          },
        ],
      },
    });

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
await flushMicrotasks();
await flushMicrotasks();
    });

await waitFor(
() => {
expect(removeBookmarkMock).toHaveBeenCalled();
      },
{ timeout: 500 },
    );
  });
});

describe('<QuizCtaStrip /> — auth & state', () => {
it('renders the disabled sign-in branch when unauthenticated', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container, { requireDefaultCollection: false });
const signin = container.querySelector(
'[data-testid="bookmark-button-signin-tooltip"]',
    ) as HTMLButtonElement;
expect(signin).toBeTruthy();
expect(signin).toBeDisabled();

await act(async () => {
fireEvent.click(signin);
await flushMicrotasks();
    });
expect(addBookmarkMock).not.toHaveBeenCalled();
expect(removeBookmarkMock).not.toHaveBeenCalled();
  });

it('renders the loading branch while the membership SWR hydrates', () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });

listCollectionsMock.mockReset();
listCollectionsMock.mockReturnValue(new Promise(() => {}));

const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
const loading = container.querySelector(
'[data-testid="bookmark-button-loading"]',
    ) as HTMLButtonElement;
expect(loading).toBeTruthy();
expect(loading).toBeDisabled();
  });
});

describe('<QuizCtaStrip /> — Start CTA', () => {
it('keeps the Start CTA disabled with no link or form behavior', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
const start = screen.getByRole('button', {
name: 'Start attempt (unavailable)',
    });
expect(start).toBeDisabled();
expect(start).toHaveAttribute('type', 'button');
expect(container.querySelector('a[href*="/start"]')).toBeNull();
expect(start.className).toMatch(/h-10/);
expect(start.className).toMatch(/min-w-40/);
  });

it('exposes the exact release tooltip when the Start CTA wrapper receives keyboard focus', async () => {
render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );

const trigger = screen.getByTestId('quiz-start-tooltip-trigger');
expect(trigger).toHaveAttribute('tabindex', '0');
fireEvent.focus(trigger);

await waitFor(() => {
expect(screen.getByRole('tooltip')).toHaveTextContent(
QUIZ_START_ATTEMPT_TOOLTIP,
      );
    });
expect(QUIZ_START_ATTEMPT_TOOLTIP).toBe(
'Starting attempts opens in a later release',
    );
  });
});

describe('<QuizCtaStrip /> — no_collection outcome', () => {
it('opens the setup prompt when the user owns zero collections, without a mutation', async () => {
listCollectionsMock.mockReset();
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container, { requireDefaultCollection: false });
const slot = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement;
const button = slot.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeTruthy();

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

expect(screen.getByTestId('quiz-start-attempt-button')).toBeDisabled();
  });
});

describe('<QuizCtaStrip /> — error path', () => {
it('renders the inline retryable error notice when addBookmark rejects with a 5xx', async () => {
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(500, 'INTERNAL_ERROR'),
    );

const { container } = render(
<TestSwrProvider>
<QuizCtaStrip quizId={QUIZ_ID} />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);
const slot = container.querySelector(
'[data-testid="bookmark-button-slot"]',
    ) as HTMLElement;
const button = slot.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeTruthy();

await act(async () => {
fireEvent.click(button);
await flushMicrotasks();
    });

await waitFor(() => {
expect(
document.querySelector(
'[data-testid="bookmark-error-notice-retryable"]',
        ),
      ).toBeTruthy();
    });

expect(screen.getByTestId('quiz-start-attempt-button')).toBeDisabled();
  });
});
