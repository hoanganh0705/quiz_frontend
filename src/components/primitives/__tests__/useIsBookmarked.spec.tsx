

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useIsBookmarked } from '@/features/quizzes/hooks/useIsBookmarked';

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

function bookmark(quizId: string, bookmarkId: string) {
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

function Probe({ quizId }: { quizId: string }) {
const { isBookmarked, isLoading } = useIsBookmarked(quizId);
return (
<div
data-testid='probe'
data-bookmarked={String(isBookmarked)}
data-loading={String(isLoading)}
    />
  );
}

function CapturingProbe({
quizId,
onCapture,
}: {
quizId: string;
onCapture: (snapshot: { isBookmarked: boolean; isLoading: boolean }) => void;
}) {
const snapshot = useIsBookmarked(quizId);
onCapture(snapshot);
return <div data-testid='capture' />;
}

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('useIsBookmarked — unauthenticated', () => {
it('(a) returns { isBookmarked: false, isLoading: false } when isAuthenticated === false', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { getByTestId } = render(<Probe quizId='quiz-A' />, {
wrapper: TestSwrProvider,
    });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
expect(probeEl.getAttribute('data-loading')).toBe('false');
    });

expect(listCollectionsMock).not.toHaveBeenCalled();
  });
});

describe('useIsBookmarked — initial authenticated hydration', () => {
it('(b) returns { isBookmarked: false, isLoading: true } during the fan-out fetch', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = {
collectionId: uuidV7(1),
userId: uuidV7(99),
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
    };
listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });

let resolveBookmarks: (value: unknown) => void = () => {};
const bookmarksPromise = new Promise((resolve) => {
resolveBookmarks = resolve;
    });
listBookmarksInCollectionMock.mockReturnValue(bookmarksPromise);

const { getByTestId } = render(<Probe quizId={uuidV7(10)} />, {
wrapper: TestSwrProvider,
    });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
expect(probeEl.getAttribute('data-loading')).toBe('true');
    });

resolveBookmarks({ data: { items: [] } });
  });
});

describe('useIsBookmarked — hydrated present ID', () => {
it('(c) returns { isBookmarked: true, isLoading: false } when the quizId is in the membership Set', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = {
collectionId: uuidV7(1),
userId: uuidV7(99),
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
    };
const targetQuizId = uuidV7(10);
listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });
listBookmarksInCollectionMock.mockResolvedValue({
data: { items: [bookmark(targetQuizId, uuidV7(100)), bookmark(uuidV7(11), uuidV7(101))] },
    });

const { getByTestId } = render(<Probe quizId={targetQuizId} />, {
wrapper: TestSwrProvider,
    });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-bookmarked')).toBe('true');
expect(probeEl.getAttribute('data-loading')).toBe('false');
    });
  });
});

describe('useIsBookmarked — hydrated absent ID', () => {
it('(d) returns { isBookmarked: false, isLoading: false } when the quizId is NOT in the membership Set', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = {
collectionId: uuidV7(1),
userId: uuidV7(99),
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
    };
listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });
listBookmarksInCollectionMock.mockResolvedValue({
data: { items: [bookmark(uuidV7(11), uuidV7(101))] },
    });

const { getByTestId } = render(<Probe quizId={uuidV7(10)} />, {
wrapper: TestSwrProvider,
    });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-bookmarked')).toBe('false');
expect(probeEl.getAttribute('data-loading')).toBe('false');
    });
  });
});

describe('useIsBookmarked — membership-driven rerenders', () => {
it('(e) rerenders when the membership cache changes from present to absent', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
const col1 = {
collectionId: uuidV7(1),
userId: uuidV7(99),
name: 'Favourites',
description: null,
quizCount: 0,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
    };
listCollectionsMock.mockResolvedValue({ data: { items: [col1] } });

const targetQuizId = uuidV7(10);

listBookmarksInCollectionMock.mockResolvedValueOnce({
data: { items: [bookmark(targetQuizId, uuidV7(100))] },
    });

let snapshotRef: { isBookmarked: boolean; isLoading: boolean } | null = null;
const { rerender } = render(
<CapturingProbe
quizId={targetQuizId}
onCapture={(s) => {
snapshotRef = s;
        }}
      />,
{ wrapper: TestSwrProvider },
    );

await waitFor(() => {
expect(snapshotRef?.isBookmarked).toBe(true);
    });

listBookmarksInCollectionMock.mockResolvedValueOnce({
data: { items: [] },
    });
rerender(
<CapturingProbe
quizId={targetQuizId}
onCapture={(s) => {
snapshotRef = s;
        }}
      />,
    );

expect(snapshotRef?.isBookmarked).toBe(true);
  });
});

describe('useIsBookmarked — exported signature', () => {
it('(g) the result shape is exactly { isBookmarked, isLoading }', () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

let snapshotRef: { isBookmarked: boolean; isLoading: boolean } | null = null;
const { getByTestId } = render(
<CapturingProbe
quizId='quiz-stable'
onCapture={(s) => {
snapshotRef = s;
        }}
      />,
{ wrapper: TestSwrProvider },
    );

expect(getByTestId('capture')).toBeInTheDocument();
expect(snapshotRef).not.toBeNull();
expect(Object.keys(snapshotRef!).sort()).toEqual(['isBookmarked', 'isLoading']);
  });
});