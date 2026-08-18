

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { QuizCard } from '@/components/primitives';
import { QuizCtaStrip } from '@/features/quizzes/components/QuizCtaStrip';
import { mockQuizListItemDto } from '@/components/primitives/__tests__/render-helpers';

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
const useIsUserLoadingMock = vi.fn();
const useUserStoreMock = vi.fn();
vi.mock('@/features/users/store/user-store', () => ({
useUser: () => useUserMock(),
useIsUserLoading: () => useIsUserLoadingMock(),
useUserStore: (selector?: (state: unknown) => unknown) =>
useUserStoreMock(selector),
}));

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

beforeEach(() => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
useUserMock.mockReturnValue({
userId: USER_ID,
username: 'integration',
email: 'integration@example.com',
role: 'user',
isVerified: true,
  });
useIsUserLoadingMock.mockReturnValue(false);
useUserStoreMock.mockReturnValue(null);
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

useAuthStateMock.mockReturnValue({ isAuthenticated: true });
useUserMock.mockReturnValue({
userId: USER_ID,
username: 'integration',
email: 'integration@example.com',
role: 'user',
isVerified: true,
  });
useIsUserLoadingMock.mockReturnValue(false);
useUserStoreMock.mockReturnValue(null);
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

expect(addBookmarkMock).toHaveBeenCalledWith(
TARGET_COLLECTION_ID,
{ quizId: QUIZ_A_ID },
    );

expect(optimisticPushCount()).toBe(1);

expect(invalidationCount()).toBeGreaterThanOrEqual(1);

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

const optimisticPayload = mutateMembershipCalls().find((args) =>
Array.isArray(args[1]),
    )?.[1] as Array<{ quizId: string }> | undefined;
expect(optimisticPayload).toBeDefined();
expect(optimisticPayload?.map((entry) => entry.quizId)).toEqual([
QUIZ_A_ID,
    ]);

expect(addBookmarkMock).toHaveBeenLastCalledWith(
TARGET_COLLECTION_ID,
{ quizId: QUIZ_A_ID },
    );
  });
});

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

expect(removeBookmarkMock).toHaveBeenCalledWith(
TARGET_COLLECTION_ID,
QUIZ_A_ID,
    );

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

const optimisticPayload = mutateMembershipCalls().find((args) =>
Array.isArray(args[1]),
    )?.[1] as Array<{ quizId: string }> | undefined;
expect(optimisticPayload?.map((entry) => entry.quizId)).toEqual([
QUIZ_A_ID,
    ]);
  });
});

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

expect(optimisticPushCount()).toBe(1);

expect(invalidationCount()).toBeGreaterThanOrEqual(1);

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

describe('Integrated card + detail — no_collection fan-out', () => {
it('(e1) zero collections → clicking the card opens the setup prompt and fires NO HTTP call', async () => {
listCollectionsMock.mockReset();
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { container } = render(
<TestSwrProvider>
<IntegrationTree stripQuizId={QUIZ_A_ID} />
</TestSwrProvider>,
    );

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

const dialog = await screen.findByRole('dialog');
expect(dialog).toBeTruthy();

expect(addBookmarkMock).not.toHaveBeenCalled();
expect(removeBookmarkMock).not.toHaveBeenCalled();

expect(broadcastBookmarksInvalidatedMock).not.toHaveBeenCalled();
  });
});

describe('Integrated card + detail — unauthenticated consistency', () => {
it('(f1) every consumer renders the disabled sign-in variant when unauthenticated', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
useIsUserLoadingMock.mockReturnValue(false);
useUserMock.mockReturnValue(null);

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
useIsUserLoadingMock.mockReturnValue(false);
useUserMock.mockReturnValue(null);

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
