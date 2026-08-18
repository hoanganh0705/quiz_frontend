

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import {
buildBookmarkedQuizIdSet,
bookmarkedQuizIdsKey,
useBookmarkedQuizIds,
} from '@/features/bookmarks/hooks/use-bookmarked-quiz-ids';
import type { BookmarkedQuizResponseDto } from '@/lib/api/generated/schemas';

const listCollectionsMock = vi.fn();
const listBookmarksInCollectionMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
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

function bookmark(quizId: string, bookmarkId: string): BookmarkedQuizResponseDto {
return {
bookmarkId,
quizId,
quizTitle: `Quiz ${quizId}`,
quizSlug: `quiz-${quizId}`,
quizImageUrl: null,
quizIsFeatured: false,
notes: null,
bookmarkedAt: '2026-07-01T00:00:00.000Z',
  };
}

function collection(collectionId: string, name: string, createdAt: string) {
return {
collectionId,
userId: uuidV7(99),
name,
description: null,
quizCount: 0,
createdAt,
updatedAt: createdAt,
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

function Probe() {
const lookup = useBookmarkedQuizIds();
return (
<div
data-testid='probe'
data-quiz-ids={JSON.stringify(Array.from(lookup.quizIds).sort())}
data-loading={String(lookup.isLoading)}
data-has-error={String(lookup.error !== null)}
    />
  );
}

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('useBookmarkedQuizIds — unauthenticated', () => {
it('(a) returns an empty Set without firing any fetch when isAuthenticated === false', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-quiz-ids')).toBe('[]');
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

expect(listCollectionsMock).not.toHaveBeenCalled();
expect(listBookmarksInCollectionMock).not.toHaveBeenCalled();
  });
});

describe('useBookmarkedQuizIds — zero collections', () => {
it('(b) resolves to an empty Set without calling listBookmarksInCollection', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-quiz-ids')).toBe('[]');
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

expect(listCollectionsMock).toHaveBeenCalledTimes(1);
expect(listBookmarksInCollectionMock).not.toHaveBeenCalled();
  });
});

describe('useBookmarkedQuizIds — one collection', () => {
it('(c) fetches that collection members and exposes them as a Set', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const firstCollection = collection(
uuidV7(1),
'Favourites',
'2026-07-01T00:00:00.000Z',
    );
listCollectionsMock.mockResolvedValue({ data: { items: [firstCollection] } });
listBookmarksInCollectionMock.mockResolvedValue({
data: {
items: [bookmark(uuidV7(10), uuidV7(100)), bookmark(uuidV7(11), uuidV7(101))],
      },
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-quiz-ids')).toBe(
JSON.stringify([uuidV7(10), uuidV7(11)].sort()),
      );
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

expect(listBookmarksInCollectionMock).toHaveBeenCalledTimes(1);
expect(listBookmarksInCollectionMock).toHaveBeenCalledWith(uuidV7(1));
  });
});

describe('useBookmarkedQuizIds — multiple collections', () => {
it('(d) unions members from multiple collections and deduplicates', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = collection(uuidV7(1), 'Favourites', '2026-07-01T00:00:00.000Z');
const col2 = collection(uuidV7(2), 'History', '2026-07-15T00:00:00.000Z');
listCollectionsMock.mockResolvedValue({ data: { items: [col1, col2] } });

listBookmarksInCollectionMock.mockImplementation(async (collectionId: string) => {
if (collectionId === uuidV7(1)) {
return {
data: {
items: [
bookmark(uuidV7(10), uuidV7(100)),
bookmark(uuidV7(11), uuidV7(101)),
            ],
          },
        };
      }
if (collectionId === uuidV7(2)) {
return {
data: {
items: [

bookmark(uuidV7(10), uuidV7(102)),
bookmark(uuidV7(12), uuidV7(103)),
            ],
          },
        };
      }
return { data: { items: [] } };
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-quiz-ids')).toBe(
JSON.stringify([uuidV7(10), uuidV7(11), uuidV7(12)].sort()),
      );
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

expect(listBookmarksInCollectionMock).toHaveBeenCalledTimes(2);
  });
});

describe('useBookmarkedQuizIds — partial failure', () => {
it('(e) surfaces error and leaves the Set empty when one collection fetch fails', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = collection(uuidV7(1), 'Favourites', '2026-07-01T00:00:00.000Z');
const col2 = collection(uuidV7(2), 'History', '2026-07-15T00:00:00.000Z');
listCollectionsMock.mockResolvedValue({ data: { items: [col1, col2] } });

listBookmarksInCollectionMock.mockImplementation(async (collectionId: string) => {
if (collectionId === uuidV7(1)) {
return {
data: { items: [bookmark(uuidV7(10), uuidV7(100))] },
        };
      }

throw new Error('Network error');
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-quiz-ids')).toBe('[]');
expect(probeEl.getAttribute('data-has-error')).toBe('true');
    });
  });
});

describe('buildBookmarkedQuizIdSet', () => {
it('(f1) replaces the Set on every call', () => {
const listA: ReadonlyArray<BookmarkedQuizResponseDto> = [
bookmark(uuidV7(10), uuidV7(100)),
    ];
const listB: ReadonlyArray<BookmarkedQuizResponseDto> = [
bookmark(uuidV7(11), uuidV7(101)),
    ];

const first = buildBookmarkedQuizIdSet([listA]);
const second = buildBookmarkedQuizIdSet([listB]);

expect(first.has(uuidV7(10))).toBe(true);
expect(first.has(uuidV7(11))).toBe(false);
expect(second.has(uuidV7(10))).toBe(false);
expect(second.has(uuidV7(11))).toBe(true);

expect(first).not.toBe(second);
  });

it('(f2) does NOT mutate the input BookmarkedQuizResponseDto lists', () => {
const original = [bookmark(uuidV7(10), uuidV7(100))];
const snapshot = JSON.parse(JSON.stringify(original)) as BookmarkedQuizResponseDto[];

buildBookmarkedQuizIdSet([original]);

expect(original).toEqual(snapshot);
  });

it('(f3) skips records with an empty or missing quizId', () => {
const list: ReadonlyArray<BookmarkedQuizResponseDto> = [
bookmark(uuidV7(10), uuidV7(100)),
{ ...bookmark('', uuidV7(101)), quizId: '' },
    ];
const result = buildBookmarkedQuizIdSet([list]);
expect(Array.from(result)).toEqual([uuidV7(10)]);
  });
});

describe('useBookmarkedQuizIds — SWR key', () => {
it('(g) the SWR key follows the documented shape', () => {
expect(bookmarkedQuizIdsKey()).toEqual(['bookmarked-quiz-ids']);
  });
});