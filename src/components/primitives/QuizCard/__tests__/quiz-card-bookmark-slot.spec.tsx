

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { QuizCard } from '@/components/primitives';
import { mockQuizListItemDto } from '@/components/primitives/__tests__/render-helpers';

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

async function waitForSlotHydration(container: HTMLElement) {
await waitFor(
() => {
const el = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
      ) as HTMLElement | null;
if (!el) throw new Error('slot not rendered');
if (el.getAttribute('data-default-collection-loading') === 'true') {
throw new Error('default collection still loading');
      }
    },
{ timeout: 1000 },
  );
}

describe('<QuizCard /> — bookmark slot wiring', () => {
it('(a1) renders the resolved bookmark slot once with the quiz id bound', async () => {
const quiz = mockQuizListItemDto({ quizId: QUIZ_ID });
const { container } = render(
<TestSwrProvider>
<QuizCard quiz={quiz} />
</TestSwrProvider>,
    );

await waitForSlotHydration(container);
const slot = container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    ) as HTMLElement | null;
expect(slot).toBeTruthy();
expect(slot?.getAttribute('data-variant')).toBe('card');

expect(
slot?.querySelector('[data-testid="bookmark-button-not-bookmarked"]'),
    ).toBeTruthy();
  });

it('(a2) renders exactly one bookmark slot (no duplicates)', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );

await waitForSlotHydration(container);

const slots = container.querySelectorAll(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
    );
expect(slots.length).toBe(1);
  });
});

describe('<QuizCard /> — bookmark click does not navigate', () => {
it('(b1) clicking the bookmark button calls preventDefault on the parent-link click', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );

await waitForSlotHydration(container);
const button = container.querySelector(
'[data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;
expect(button).toBeTruthy();

let preventDefaultCallCount = 0;
const realPreventDefault =
Object.getOwnPropertyDescriptor(Event.prototype, 'preventDefault')?.value ??
function (this: Event): void {
        /* default noop fallback */
      };
const spy = vi
      .spyOn(Event.prototype, 'preventDefault')
      .mockImplementation(function (this: Event) {
preventDefaultCallCount++;
realPreventDefault.call(this);
      });
fireEvent.click(button, { bubbles: true });
expect(preventDefaultCallCount).toBeGreaterThanOrEqual(1);
spy.mockRestore();
  });

it('(b2) the card link still has its href so non-bookmark clicks remain navigation', async () => {
const quiz = mockQuizListItemDto({ quizId: QUIZ_ID });
render(
<TestSwrProvider>
<QuizCard quiz={quiz} />
</TestSwrProvider>,
    );

const card = screen.getByTestId('quiz-card');
expect(card.getAttribute('href')).toBe(`/quizzes/${quiz.slug}`);
  });
});

describe('<QuizCard /> — body click navigates normally', () => {
it('(c1) clicking the title region (outside the bookmark slot) does not trigger preventDefault', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );

await waitForSlotHydration(container);
const heading = screen.getByRole('heading', { name: /sample quiz/i });

let preventDefaultCallCount = 0;
const realPreventDefault =
Object.getOwnPropertyDescriptor(Event.prototype, 'preventDefault')?.value ??
function (this: Event): void {
        /* default noop fallback */
      };
const spy = vi
      .spyOn(Event.prototype, 'preventDefault')
      .mockImplementation(function (this: Event) {
preventDefaultCallCount++;
realPreventDefault.call(this);
      });
fireEvent.click(heading, { bubbles: true });

expect(preventDefaultCallCount).toBe(0);
spy.mockRestore();
  });
});

describe('<QuizCard /> — stable card dimensions', () => {
it('(d1) the bookmark slot has `position: absolute` so it claims no flow space', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );

await waitForSlotHydration(container);
const slotWrapper = container.querySelector(
'div.absolute.right-2.top-2',
    ) as HTMLElement;
expect(slotWrapper).toBeTruthy();

const card = screen.getByTestId('quiz-card');
expect(card.contains(slotWrapper)).toBe(true);
  });

it('(d2) authenticated vs unauthenticated render yields the same outer card flow structure', async () => {

useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const { container: authContainer } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );
await waitForSlotHydration(authContainer);

useAuthStateMock.mockReturnValue({ isAuthenticated: false });
const { container: unauthContainer } = render(
<TestSwrProvider>
<QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_ID })} />
</TestSwrProvider>,
    );
await waitForSlotHydration(unauthContainer);

const cardSel = '[data-testid="quiz-card"]';
const authCard = authContainer.querySelector(cardSel) as HTMLElement;
const unauthCard = unauthContainer.querySelector(cardSel) as HTMLElement;
expect(authCard.tagName.toLowerCase()).toBe(
unauthCard.tagName.toLowerCase(),
    );
expect(authCard.getAttribute('href')).toBe(unauthCard.getAttribute('href'));

const authSlot = authContainer.querySelector(
'div.absolute.right-2.top-2',
    );
const unauthSlot = unauthContainer.querySelector(
'div.absolute.right-2.top-2',
    );
expect(authSlot).toBeTruthy();
expect(unauthSlot).toBeTruthy();
  });
});

describe('<QuizCard /> — source compatibility', () => {
it('(e1) bookmarkSlot={null} renders NO bookmark control', () => {
render(
<TestSwrProvider>
<QuizCard
quiz={mockQuizListItemDto({ quizId: QUIZ_ID })}
bookmarkSlot={null}
        />
</TestSwrProvider>,
    );

expect(
document.querySelector('[data-testid^="bookmark-button"]'),
    ).toBeNull();
  });

it('(e2) omitting bookmarkSlot is the default-feature-aware slot behaviour', async () => {
const { container } = render(
<TestSwrProvider>
<QuizCard
quiz={mockQuizListItemDto({ quizId: QUIZ_ID })}
          // Intentionally omit `bookmarkSlot` — the default should
          // mount the feature-aware slot.
        />
</TestSwrProvider>,
    );
await waitForSlotHydration(container);
expect(
container.querySelector(
'[data-testid="bookmark-button-slot"][data-state="resolved"]',
      ),
    ).toBeTruthy();
  });

it('(e3) consumers can pass a custom bookmark slot implementation', async () => {
function CustomBookmarkSlot({
quizId,
    }: {
quizId: string;
    }): React.JSX.Element {
return (
<button
type='button'
data-testid='custom-bookmark-button'
data-quiz-id={quizId}
        >
Custom
        </button>
      );
    }
render(
<TestSwrProvider>
<QuizCard
quiz={mockQuizListItemDto({ quizId: QUIZ_ID })}
bookmarkSlot={(props) => <CustomBookmarkSlot {...props} />}
        />
</TestSwrProvider>,
    );
const custom = screen.getByTestId('custom-bookmark-button');
expect(custom).toBeTruthy();
expect(custom.getAttribute('data-quiz-id')).toBe(QUIZ_ID);
  });

it('(e4) existing card props (className, data-testid) remain source-compatible', () => {
render(
<TestSwrProvider>
<QuizCard
quiz={mockQuizListItemDto({ quizId: QUIZ_ID })}
className='extra-class'
bookmarkSlot={null}
        />
</TestSwrProvider>,
    );
const card = screen.getByTestId('quiz-card');
expect(card).toBeTruthy();
expect(card.className).toMatch(/extra-class/);
expect(card.getAttribute('data-quiz-id')).toBe(QUIZ_ID);
expect(card.getAttribute('data-quiz-slug')).toBeTruthy();
  });
});
