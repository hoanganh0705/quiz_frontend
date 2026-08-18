

import type React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { ApiError } from '@/lib/api';
import { useBookmarkCollections } from '@/features/bookmarks/hooks/use-bookmark-collections';
import { useBookmarkQuiz } from '@/features/bookmarks/hooks/use-bookmark-quiz';

const mutateMock = vi.fn();
vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

const addBookmarkMock = vi.fn();
const listCollectionsMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
addBookmark: (...args: unknown[]) => addBookmarkMock(...args),
listCollections: (...args: unknown[]) => listCollectionsMock(...args),
}));

const useAuthStateMock = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-state', () => ({
useAuthState: () => useAuthStateMock(),
}));

function uuidV7(index: number): string {
const tail = String(index).padStart(12, '0');
return `0192f4d8-0000-7000-8000-${tail}`;
}

function favouriteCollection() {
return {
collectionId: uuidV7(1),
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

interface ProbeState {
pending: boolean;
outcomeKind: string | null;
errorKind: string | null;
}

function Probe({
quizId,
stateRef,
}: {
quizId: string;
stateRef: { current: ProbeState };
}) {
const { isLoading } = useBookmarkCollections();
const { isPending, lastError, lastOutcome, bookmark } =
useBookmarkQuiz(quizId);
stateRef.current = {
pending: isPending,
outcomeKind: lastOutcome?.kind ?? null,
errorKind: lastError?.kind ?? null,
  };
return (
<button
type='button'
data-testid='probe-bookmark'
data-hydrated={String(!isLoading)}
data-pending={String(isPending)}
data-outcome-kind={lastOutcome?.kind ?? ''}
data-error-kind={lastError?.kind ?? ''}
data-bookmark-handler='true'
onClick={() => {
void bookmark();
      }}
    />
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
addBookmarkMock.mockResolvedValue({
data: {
bookmarkId: uuidV7(99),
quizId: uuidV7(7),
quizTitle: 'Quiz',
quizSlug: 'quiz',
quizImageUrl: null,
quizIsFeatured: false,
notes: null,
bookmarkedAt: '2026-07-01T00:00:00.000Z',
collectionId: uuidV7(1),
    },
  });
});

afterEach(() => {
cleanup();
vi.resetAllMocks();
});

async function waitForHydration(getByTestId: (id: string) => HTMLElement) {
await waitFor(() => {
const probeEl = getByTestId('probe-bookmark');
expect(probeEl.getAttribute('data-hydrated')).toBe('true');
  });
}

describe('useBookmarkQuiz — optimistic write before network settle', () => {
it('(a) pushes the optimistic quizId into the membership cache before addBookmark settles', async () => {
const quizId = uuidV7(7);
const collectionId = uuidV7(1);

let resolveAdd: (value: unknown) => void = () => {};
addBookmarkMock.mockImplementationOnce(
() =>
new Promise((resolve) => {
resolveAdd = resolve;
        }),
    );

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

const membershipKey = ['bookmarked-quiz-ids'];
const writes = mutateMock.mock.calls.filter(
(call) =>
JSON.stringify(call[0]) === JSON.stringify(membershipKey) &&
call[2] !== undefined &&
(call[2] as { populateCache?: boolean })?.populateCache === true,
    );
expect(writes.length).toBeGreaterThan(0);

const optimisticWrite = writes.find((call) => {
const body = call[1];
if (!Array.isArray(body)) return false;
return body.some(
(item) =>
item &&
typeof item === 'object' &&
(item as { quizId?: string }).quizId === quizId,
      );
    });
expect(optimisticWrite).toBeDefined();

expect(stateRef.current.pending).toBe(true);
expect(stateRef.current.outcomeKind).toBeNull();

await act(async () => {
resolveAdd({
data: {
bookmarkId: uuidV7(99),
quizId,
collectionId,
        },
      });
await flushMicrotasks();
    });

expect(addBookmarkMock).toHaveBeenCalledTimes(1);
expect(addBookmarkMock).toHaveBeenCalledWith(collectionId, { quizId });

await waitFor(() => {
expect(stateRef.current.pending).toBe(false);
    });
expect(stateRef.current.outcomeKind).toBe('success');
expect(stateRef.current.errorKind).toBeNull();
  });
});

describe('useBookmarkQuiz — wrapper call shape', () => {
it('(b) calls addBookmark with the selected collectionId and { quizId }', async () => {
const quizId = uuidV7(7);
const collectionId = uuidV7(1);

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

expect(addBookmarkMock).toHaveBeenCalledTimes(1);
expect(addBookmarkMock).toHaveBeenCalledWith(collectionId, { quizId });
  });
});

describe('useBookmarkQuiz — success path', () => {
it('(c) invalidates the membership, collections-summary, and targeted status keys', async () => {
const quizId = uuidV7(7);

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

const invalidateCalls = mutateMock.mock.calls.filter((call) => {
const opts = call[2] as { revalidate?: boolean } | undefined;
return call[1] === undefined && opts?.revalidate === true;
    });

const invalidatedKeys = invalidateCalls.map(
(call) => JSON.stringify(call[0]),
    );

expect(invalidatedKeys).toContain(JSON.stringify(['bookmarked-quiz-ids']));
expect(invalidatedKeys).toContain(JSON.stringify(['bookmark-collections']));
expect(invalidatedKeys).toContain(
JSON.stringify(['bookmark-status', quizId]),
    );
  });
});

describe('useBookmarkQuiz — 409 reconciliation', () => {
it('(d) reconciles a 409 conflict as bookmarked success — no rollback, no error', async () => {
const quizId = uuidV7(7);
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(409, 'BOOKMARK_CONFLICT'),
    );

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

await waitFor(() => {
expect(stateRef.current.pending).toBe(false);
    });
expect(stateRef.current.outcomeKind).toBe('already_bookmarked');
expect(stateRef.current.errorKind).toBeNull();
  });
});

describe('useBookmarkQuiz — error rollback', () => {
it('(e1) a 429 produces lastOutcome = reverted + lastError.kind = http_429', async () => {
const quizId = uuidV7(7);
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(429, 'GLOBAL_RATE_LIMITED'),
    );

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

await waitFor(() => {
expect(stateRef.current.pending).toBe(false);
    });
expect(stateRef.current.outcomeKind).toBe('reverted');
expect(stateRef.current.errorKind).toBe('http_429');
  });

it('(e2) a 500 produces lastError.kind = http_5xx', async () => {
const quizId = uuidV7(7);
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

await waitFor(() => {
expect(stateRef.current.errorKind).toBe('http_5xx');
    });
expect(stateRef.current.outcomeKind).toBe('reverted');
  });

it('(e3) a network failure (TypeError) maps to lastError.kind = unknown', async () => {
const quizId = uuidV7(7);
addBookmarkMock.mockReset();
addBookmarkMock.mockImplementationOnce(async () => {
throw new TypeError('network down');
    });

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

await waitFor(() => {
expect(stateRef.current.errorKind).toBe('unknown');
    });
expect(stateRef.current.outcomeKind).toBe('reverted');
  });

it('(e4) rollback revalidates the membership cache', async () => {
const quizId = uuidV7(7);
addBookmarkMock.mockReset();
addBookmarkMock.mockRejectedValueOnce(
makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
    );

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

await waitFor(() => {
expect(stateRef.current.errorKind).toBe('http_5xx');
    });

const revalidated = mutateMock.mock.calls.filter((call) => {
const opts = call[2] as { revalidate?: boolean } | undefined;
return (
call[1] === undefined &&
opts?.revalidate === true &&
JSON.stringify(call[0]) === JSON.stringify(['bookmarked-quiz-ids'])
      );
    });
expect(revalidated.length).toBeGreaterThan(0);
  });
});

describe('useBookmarkQuiz — no-collection outcome', () => {
it('(f) returns lastOutcome.kind = no_collection and fires zero addBookmark calls when collections are empty', async () => {
const quizId = uuidV7(7);
listCollectionsMock.mockReset();
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { getByTestId } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

await waitForHydration(getByTestId);

const button = getByTestId('probe-bookmark');
await act(async () => {
button.click();
await flushMicrotasks();
    });

expect(addBookmarkMock).not.toHaveBeenCalled();
expect(stateRef.current.outcomeKind).toBe('no_collection');
expect(stateRef.current.pending).toBe(false);
expect(stateRef.current.errorKind).toBeNull();
  });
});

describe('useBookmarkQuiz — 500 ms coalesce', () => {
it('(g) calls within 500 ms produce a single addBookmark invocation', async () => {
const quizId = uuidV7(7);

let resolveAdd: (value: unknown) => void = () => {};
addBookmarkMock.mockReset();
addBookmarkMock.mockImplementation(
() =>
new Promise((resolve) => {
resolveAdd = resolve;
        }),
    );

const { result } = renderHook(() => useBookmarkQuiz(quizId), {
wrapper: TestSwrProvider,
    });

await act(async () => {
await flushMicrotasks();
await flushMicrotasks();
    });

await act(async () => {
void result.current.bookmark();
await flushMicrotasks();
await flushMicrotasks();
    });
await act(async () => {
void result.current.bookmark();
await flushMicrotasks();
    });

expect(addBookmarkMock).toHaveBeenCalledTimes(1);

await act(async () => {
resolveAdd({ data: { bookmarkId: uuidV7(99), quizId } });
await flushMicrotasks();
    });
  });
});

describe('useBookmarkQuiz — unauthenticated short-circuit', () => {
it('(h) does not fire addBookmark and surfaces lastOutcome.kind = unauthenticated', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
const quizId = uuidV7(7);

const stateRef: { current: ProbeState } = {
current: { pending: false, outcomeKind: null, errorKind: null },
    };

const { container } = render(<Probe quizId={quizId} stateRef={stateRef} />, {
wrapper: TestSwrProvider,
    });

const button = await waitFor(
() => {
const el = container.querySelector(
'[data-testid="probe-bookmark"]',
        ) as HTMLButtonElement | null;
if (!el) throw new Error('probe-bookmark not rendered');
return el;
      },
{ timeout: 1000 },
    );
expect(button.getAttribute('data-hydrated')).toBe('true');

await act(async () => {
button.click();
await flushMicrotasks();
    });

expect(addBookmarkMock).not.toHaveBeenCalled();
expect(stateRef.current.outcomeKind).toBe('unauthenticated');
expect(stateRef.current.pending).toBe(false);
expect(stateRef.current.errorKind).toBeNull();
  });
});