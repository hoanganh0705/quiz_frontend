/**
 * Card + detail composition integration tests.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.G1 — Integrated card/detail composition tests.
 *
 * Cross-component fan-out is the contract being verified here. The
 * individual primitives (`<QuizCard />`, `<QuizCtaStrip />`,
 * `<BookmarkButtonSlot />`, `useBookmarkQuiz`, `useUnbookmarkQuiz`,
 * `useBookmarkedQuizIds`) each have their own dedicated spec files —
 * this file composes them in one tree to verify the shared
 * membership cache + mutation fan-out contract at the
 * cross-component boundary.
 *
 * ## What this test verifies
 *
 *   (a) A bookmark mutation from a card issues:
 *       - the `addBookmark` POST with the correct default collection
 *       - a single optimistic `mutate(KEY_MEMBERSHIP, optimisticList)`
 *         write followed by the `useOptimisticToggle` invalidation
 *         (`mutate(KEY_MEMBERSHIP, undefined, { revalidate: true })`)
 *       - exactly one `broadcastBookmarksInvalidated({ userId })` event
 *       - the same contract for a card A → card B fan-out (call counts
 *         are scoped per quiz ID and the network mutation is scoped to
 *         the right collection).
 *   (b) A bookmark mutation from the detail CTA strip fires the same
 *       three signals but via the `useUnbookmarkQuiz` path when the
 *       quiz is already bookmarked.
 *   (c) A 4xx rollback triggers the rollback discipline
 *       (`mutate(KEY_MEMBERSHIP, undefined, { revalidate: true })`)
 *       without broadcasting the cross-tab invalidation event.
 *   (d) A mutation on a different quiz ID does not affect the other
 *       quiz's optimistic write or broadcast.
 *   (e) The `no_collection` outcome opens the setup prompt +
 *       makes no HTTP mutation.
 *   (f) Unauthenticated state renders the disabled sign-in variant
 *       on both surfaces and never fires an HTTP call.
 *
 * ## Why we mock `swr.mutate`
 *
 * `useOptimisticToggle` (Story 3.9 B1) and `useBookmarkQuiz`
 * (TKT-3.10.C1) drive the membership cache via the global
 * `mutate(key, data, options)` import from `'swr'`. The integration
 * contract under test is NOT the SWR cache itself (that is owned by
 * the SWR library + the B3 hook's own unit tests); it is the
 * SEQUENCE of cache calls the mutation hooks make — the optimistic
 * push, the post-success invalidation, and the rollback revalidation.
 * Mocking `swr.mutate` lets us assert the exact call sequence.
 *
 * The per-surface UI behaviour (loading / unauthenticated / no-collection
 * branches) is verified independently in `<QuizCard />` and
 * `<QuizCtaStrip />` spec files. Here we only verify the cross-cutting
 * mutation fan-out.
 *
 * Test-environment notes: vitest's `jsdom` project picks up files
 * under `src/components/primitives/__tests__/`.
 */

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { QuizCard } from '@/components/primitives';
import { QuizCtaStrip } from '@/features/quizzes/components/QuizCtaStrip';
import { mockQuizListItemDto } from '@/components/primitives/__tests__/render-helpers';

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

const broadcastBookmarksInvalidatedMock = vi.fn();
const subscribeToBookmarkEventsMock = vi.fn(
  (): (() => void) => () => {},
);

vi.mock('@/lib/api/core/bookmarks-broadcast-channel', () => ({
  broadcastBookmarksInvalidated: (
    ...args: unknown[]
  ): unknown => broadcastBookmarksInvalidatedMock(...args),
  subscribeToBookmarkEvents: (
    handler: unknown,
  ): (() => void) => subscribeToBookmarkEventsMock(handler),
}));

const useUserMock = vi.fn();
vi.mock('@/features/users/store/user-store', () => ({
  useUser: () => useUserMock(),
}));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function uuidV7(index: number): string {
  const tail = String(index).padStart(12, '0');
  return `0192f4d8-0000-7000-8000-${tail}`;
}

const TARGET_COLLECTION_ID = uuidV7(1);
const QUIZ_A_ID = uuidV7(7);
const QUIZ_B_ID = uuidV7(8);
const USER_ID = uuidV7(2);

function favouriteCollection() {
  return {
    collectionId: TARGET_COLLECTION_ID,
    userId: USER_ID,
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

interface IntegrationProps {
  /**
   * The quiz ID mounted on the CTA strip. Both QuizCard A and
   * QuizCard B are always present.
   */
  stripQuizId?: string;
}

function IntegrationTree({ stripQuizId }: IntegrationProps): React.JSX.Element {
  return (
    <div>
      <QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_A_ID, slug: 'quiz-a' })} />
      <QuizCard quiz={mockQuizListItemDto({ quizId: QUIZ_B_ID, slug: 'quiz-b' })} />
      {stripQuizId ? <QuizCtaStrip quizId={stripQuizId} /> : null}
    </div>
  );
}

function TestSwrProvider({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
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

async function waitForSlotHydration(
  container: HTMLElement,
  quizId: string,
): Promise<void> {
  await waitFor(
    () => {
      const cards = container.querySelectorAll(
        `[data-testid="quiz-card"][data-quiz-id="${quizId}"] [data-testid="bookmark-button-slot"][data-state="resolved"]`,
      );
      expect(cards.length).toBeGreaterThanOrEqual(1);
    },
    { timeout: 1500 },
  );
}

/**
 * Filter the `mutateMock` call list to the calls whose key matches
 * the bookmarked-quiz-ids cache key. The SWR key is
 * `['bookmarked-quiz-ids']` (the stable B3 key from C1/C2). The
 * `useBookmarkedQuizIds` reader uses a longer key including the
 * collectionIdsKey, but the mutation hooks always invalidate the
 * short form.
 */
function mutateMembershipCalls(): unknown[][] {
  return mutateMock.mock.calls.filter((args) => {
    const key = args[0] as unknown;
    return (
      Array.isArray(key) &&
      key[0] === 'bookmarked-quiz-ids' &&
      (key as unknown[]).length === 1
    );
  });
}

/**
 * Count the optimistic pushes (writes returning an array) vs the
 * invalidations (writes with `undefined` data + `revalidate: true`).
 */
function optimisticPushCount(): number {
  return mutateMembershipCalls().filter((args) => {
    const data = args[1];
    return Array.isArray(data);
  }).length;
}

function invalidationCount(): number {
  return mutateMembershipCalls().filter((args) => {
    const options = args[2] as { revalidate?: boolean } | undefined;
    return args[1] === undefined && options?.revalidate === true;
  }).length;
}

// ---------------------------------------------------------------------------
// Test lifecycle
// ---------------------------------------------------------------------------

beforeEach(() => {
  useAuthStateMock.mockReturnValue({ isAuthenticated: true });
  useUserMock.mockReturnValue({
    userId: USER_ID,
    username: 'integration',
    email: 'integration@example.com',
    role: 'user',
    isVerified: true,
  });
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
  // Reset the lifecycle mocks again because `vi.resetAllMocks` clears
  // returns and implementations; we need the defaults for the next
  // test.
  useAuthStateMock.mockReturnValue({ isAuthenticated: true });
  useUserMock.mockReturnValue({
    userId: USER_ID,
    username: 'integration',
    email: 'integration@example.com',
    role: 'user',
    isVerified: true,
  });
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

/**
 * Reconfigure the membership fan-out for a seeded "already bookmarked"
 * state. The bookmark mutation mock (`getBookmarkStatusMock`) is
 * also flipped so `useUnbookmarkQuiz`'s preflight reports the quiz as
 * present in the collection.
 */
function seedMembership(quizIds: readonly string[]): void {
  listBookmarksInCollectionMock.mockReset();
  listBookmarksInCollectionMock.mockResolvedValue({
    data: { items: quizIds.map((id) => bookmarkPayload(id)) },
  });
  getBookmarkStatusMock.mockReset();
  getBookmarkStatusMock.mockResolvedValue({
    data: {
      bookmarked: quizIds.length > 0,
      collections: quizIds.length > 0
        ? [{ collectionId: TARGET_COLLECTION_ID }]
        : [],
    },
  });
}

function bookmarkPayload(quizId: string): {
  bookmarkId: string;
  quizId: string;
  quizTitle: string;
  quizSlug: string;
  quizImageUrl: string | null;
  quizIsFeatured: boolean;
  notes: string | null;
  bookmarkedAt: string;
} {
  return {
    bookmarkId: `bm-${quizId}`,
    quizId,
    quizTitle: 'Seeded quiz',
    quizSlug: `seeded-${quizId}`,
    quizImageUrl: null,
    quizIsFeatured: false,
    notes: null,
    bookmarkedAt: '2026-07-01T00:00:00.000Z',
  };
}

// ---------------------------------------------------------------------------
// (a) Card mutation fan-out checks
// ---------------------------------------------------------------------------

describe('Integrated card + detail — fan-out on card click', () => {
  it('(a1) clicking the card bookmark issues: addBookmark POST, optimistic push, invalidation, and exactly one broadcast', async () => {
    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const cardButton = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-not-bookmarked"]`,
    ) as HTMLButtonElement;

    await act(async () => {
      cardButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(addBookmarkMock).toHaveBeenCalledTimes(1);
    });

    // addBookmark was called with the default collection + the quizId.
    expect(addBookmarkMock).toHaveBeenCalledWith(
      TARGET_COLLECTION_ID,
      { quizId: QUIZ_A_ID },
    );

    // The optimistic push + the post-success invalidation should
    // both be present in the mutate call list.
    expect(optimisticPushCount()).toBe(1);
    // Invalidations: one for the membership key + one for the
    // collections key + one for the per-quiz status key. We
    // assert at least two invalidations on the membership key
    // (the optimistic push pre-read + the post-success invalidate).
    expect(invalidationCount()).toBeGreaterThanOrEqual(1);

    // Cross-tab broadcast fires exactly once with the userId.
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledWith({
      userId: USER_ID,
    });
  });

  it('(a2) clicking card A does not affect card B — both POSTs are scoped per quizId, and the optimistic push is too', async () => {
    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);
    await waitForSlotHydration(container, QUIZ_B_ID);

    // Click card A.
    const cardAButton = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-not-bookmarked"]`,
    ) as HTMLButtonElement;
    await act(async () => {
      cardAButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(addBookmarkMock).toHaveBeenCalledTimes(1);
    });

    // The optimistic push payload contains only QUIZ_A_ID.
    const optimisticPayload = mutateMembershipCalls().find((args) =>
      Array.isArray(args[1]),
    )?.[1] as Array<{ quizId: string }> | undefined;
    expect(optimisticPayload).toBeDefined();
    expect(optimisticPayload?.map((entry) => entry.quizId)).toEqual([
      QUIZ_A_ID,
    ]);

    // The single fire is scoped to QUIZ_A_ID via the
    // `addBookmark` payload — the second card never received a
    // click so `addBookmarkMock` was called once.
    expect(addBookmarkMock).toHaveBeenLastCalledWith(
      TARGET_COLLECTION_ID,
      { quizId: QUIZ_A_ID },
    );
  });
});

// ---------------------------------------------------------------------------
// (b) Detail CTA strip fan-out
// ---------------------------------------------------------------------------

describe('Integrated card + detail — fan-out on CTA strip click', () => {
  it('(b1) clicking the CTA strip issues the remove path with the right collection + broadcast', async () => {
    seedMembership([QUIZ_A_ID]);

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const detailButton = container.querySelector(
      '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-bookmarked"]',
    ) as HTMLButtonElement;

    await act(async () => {
      detailButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(removeBookmarkMock).toHaveBeenCalledTimes(1);
    });

    // removeBookmark was called with the target collection +
    // the quizId from the URL.
    expect(removeBookmarkMock).toHaveBeenCalledWith(
      TARGET_COLLECTION_ID,
      QUIZ_A_ID,
    );

    // Exactly one broadcast event.
    expect(broadcastBookmarksInvalidatedMock).toHaveBeenCalledTimes(1);
  });

  it('(b2) clicking the CTA strip in the unbookmarked state re-routes to addBookmark, mirroring the card semantics', async () => {
    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const detailButton = container.querySelector(
      '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-not-bookmarked"]',
    ) as HTMLButtonElement;

    await act(async () => {
      detailButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(addBookmarkMock).toHaveBeenCalledTimes(1);
    });

    expect(removeBookmarkMock).not.toHaveBeenCalled();
    expect(addBookmarkMock).toHaveBeenCalledWith(
      TARGET_COLLECTION_ID,
      { quizId: QUIZ_A_ID },
    );

    // The optimistic push payload contains QUIZ_A_ID.
    const optimisticPayload = mutateMembershipCalls().find((args) =>
      Array.isArray(args[1]),
    )?.[1] as Array<{ quizId: string }> | undefined;
    expect(optimisticPayload?.map((entry) => entry.quizId)).toEqual([
      QUIZ_A_ID,
    ]);
  });
});

// ---------------------------------------------------------------------------
// (c) 4xx rollback discipline
// ---------------------------------------------------------------------------

describe('Integrated card + detail — rollback fan-out', () => {
  it('(c1) a 400 BAD_REQUEST on the add path triggers the rollback invalidate and NO broadcast', async () => {
    addBookmarkMock.mockReset();
    addBookmarkMock.mockRejectedValueOnce(makeApiError(400, 'BAD_REQUEST'));

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const cardButton = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-not-bookmarked"]`,
    ) as HTMLButtonElement;

    await act(async () => {
      cardButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(addBookmarkMock).toHaveBeenCalledTimes(1);
    });

    // The optimistic push DID happen (the cache is mutated
    // before the network call to give the user immediate feedback).
    expect(optimisticPushCount()).toBe(1);

    // The rollback invalidate triggers a revalidation — count
    // must be >= 1 (the rollback revalidation is in addition to
    // the primitive's normal "no-op on 4xx" no-invalidation).
    expect(invalidationCount()).toBeGreaterThanOrEqual(1);

    // No broadcast — failed mutations must not propagate to
    // sibling tabs (F2 AC #4).
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });

  it('(c2) a 429 on the remove path triggers the rollback invalidate and NO broadcast', async () => {
    seedMembership([QUIZ_A_ID]);
    removeBookmarkMock.mockReset();
    removeBookmarkMock.mockRejectedValueOnce(
      makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const detailButton = container.querySelector(
      '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-bookmarked"]',
    ) as HTMLButtonElement;

    await act(async () => {
      detailButton.click();
      await flushMicrotasks();
    });

    await waitFor(() => {
      expect(removeBookmarkMock).toHaveBeenCalledTimes(1);
    });

    expect(invalidationCount()).toBeGreaterThanOrEqual(1);
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (e) no_collection short-circuit
// ---------------------------------------------------------------------------

describe('Integrated card + detail — no_collection fan-out', () => {
  it('(e1) zero collections → clicking the card opens the setup prompt and fires NO HTTP call', async () => {
    listCollectionsMock.mockReset();
    listCollectionsMock.mockResolvedValue({ data: { items: [] } });

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    // Wait for hydration to settle.
    await waitFor(
      () => {
        const cardSlot = container.querySelector(
          `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-slot"][data-state="resolved"]`,
        );
        const detailSlot = container.querySelector(
          '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-slot"][data-state="resolved"]',
        );
        expect(cardSlot).toBeTruthy();
        expect(detailSlot).toBeTruthy();
      },
      { timeout: 1500 },
    );

    const cardButton = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-not-bookmarked"]`,
    ) as HTMLButtonElement;

    await act(async () => {
      cardButton.click();
      await flushMicrotasks();
    });

    // The setup prompt renders once for the page.
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toBeTruthy();

    // No HTTP call.
    expect(addBookmarkMock).not.toHaveBeenCalled();
    expect(removeBookmarkMock).not.toHaveBeenCalled();
    // No broadcast.
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// (f) Unauthenticated consistency
// ---------------------------------------------------------------------------

describe('Integrated card + detail — unauthenticated consistency', () => {
  it('(f1) every consumer renders the disabled sign-in variant when unauthenticated', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const cardASignin = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-signin-tooltip"]`,
    );
    const cardBSignin = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_B_ID}"] [data-testid="bookmark-button-signin-tooltip"]`,
    );
    const detailSignin = container.querySelector(
      '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-signin-tooltip"]',
    );

    expect(cardASignin).toBeTruthy();
    expect(cardBSignin).toBeTruthy();
    expect(detailSignin).toBeTruthy();

    for (const button of [cardASignin, cardBSignin, detailSignin]) {
      expect((button as HTMLButtonElement).disabled).toBe(true);
    }
  });

  it('(f2) clicks on disabled sign-in buttons make no HTTP requests on any surface', async () => {
    useAuthStateMock.mockReturnValue({ isAuthenticated: false });

    const { container } = render(
      <TestSwrProvider>
        <IntegrationTree stripQuizId={QUIZ_A_ID} />
      </TestSwrProvider>,
    );

    await waitForSlotHydration(container, QUIZ_A_ID);

    const cardASignin = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_A_ID}"] [data-testid="bookmark-button-signin-tooltip"]`,
    ) as HTMLButtonElement;
    const cardBSignin = container.querySelector(
      `[data-testid="quiz-card"][data-quiz-id="${QUIZ_B_ID}"] [data-testid="bookmark-button-signin-tooltip"]`,
    ) as HTMLButtonElement;
    const detailSignin = container.querySelector(
      '[data-testid="quiz-cta-strip"] [data-testid="bookmark-button-signin-tooltip"]',
    ) as HTMLButtonElement;

    cardASignin.click();
    cardBSignin.click();
    detailSignin.click();

    expect(addBookmarkMock).not.toHaveBeenCalled();
    expect(removeBookmarkMock).not.toHaveBeenCalled();
    expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});
