/**
 * `<QuizCtaStrip />` — quiz detail CTA strip tests.
 *
 * Source epic:   Story 3.6 — quiz detail.
 * Source ticket: TKT-3.6.D2 (preserved) + Story 3.10 / TKT-3.10.E2
 *                (bookmark slot wiring).
 *
 * Cases:
 *
 *   (1) The bookmark control uses the same feature-aware slot as
 *       the card surface (BookmarksLookupHydrator contract). The
 *       `data-testid="quiz-bookmark-button"` selector from
 *       Story 3.6 is replaced by the slot's `data-testid` family,
 *       so the legacy selector resolves to the inner D1 button.
 *   (2) Bookmark and unbookmark click paths fire the right
 *       underlying action hook (covered here indirectly via slot
 *       wiring; per-click details belong to `<BookmarkButtonSlot.spec.tsx>`).
 *   (3) Loading / unauthenticated states route through the slot's
 *       controlled branches.
 *   (4) The Start CTA test selects (`quiz-start-attempt-button`,
 *       `quiz-start-tooltip-trigger`) keep working unchanged.
 *   (5) Exactly ONE bookmark button is rendered.
 *   (6) `no_collection` outcome still routes through the slot
 *       without affecting the Start CTA layout.
 *   (7) Error and retry path surface in the same slot's inline
 *       notice (C3 mapper) — Start CTA layout unaffected.
 */

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import {
  QUIZ_START_ATTEMPT_TOOLTIP,
  QuizCtaStrip,
} from '@/features/quizzes/components/QuizCtaStrip';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (1) Strip renders slot + Start CTA
// ---------------------------------------------------------------------------

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

    // Start CTA is present and disabled.
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
    // The slot replaces the outer wrapper, but the inner D1 button
    // keeps the bookmark test-id pattern. The legacy selector
    // `data-testid="quiz-bookmark-button"` (Story 3.6) is intentionally
    // NOT preserved verbatim because the slot owns the
    // `bookmark-button-${branch}` pattern. The DETAIL variant renders
    // 'iconWithLabel', so we look for the unbookmarked branch.
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
    // `<BookmarkButtonSlot />` renders ONE outer slot. The inner D1
    // primitive div also has `data-testid="bookmark-button-slot"`,
    // but `data-state="resolved"` is only on the outer wrapper.
    const slots = container.querySelectorAll(
      '[data-testid="bookmark-button-slot"][data-state="resolved"]',
    );
    expect(slots.length).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// (2) Click paths — bookmark and unbookmark
// ---------------------------------------------------------------------------

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
    // Drive the membership cache with a list containing the target quiz.
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
    // Wait until the slot reports `data-bookmarked="true"` — that is
    // the canonical resolved + bookmarked state for this test.
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

    // removeBookmark needs a status-collection to pick. The
    // status default mock returns `{ bookmarked: false, collections: [] }`.
    // We drive it with our target collection so the C2 hook picks
    // the right collectionId for the DELETE.
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

// ---------------------------------------------------------------------------
// (3) Loading / unauthenticated
// ---------------------------------------------------------------------------

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
    // Replace the default listCollections mock with one that never
    // resolves so the slot stays in its loading branch for the
    // assertion's lifetime.
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

// ---------------------------------------------------------------------------
// (4) Start CTA — preserved
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (6) no_collection opens setup prompt without affecting Start CTA
// ---------------------------------------------------------------------------

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
    // Start CTA is unaffected.
    expect(screen.getByTestId('quiz-start-attempt-button')).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// (7) Error path surfaces inline notice
// ---------------------------------------------------------------------------

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
    // Start CTA untouched.
    expect(screen.getByTestId('quiz-start-attempt-button')).toBeDisabled();
  });
});
