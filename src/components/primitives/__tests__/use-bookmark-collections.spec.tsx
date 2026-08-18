

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import {
bookmarkCollectionsKey,
useBookmarkCollections,
} from '@/features/bookmarks/hooks/use-bookmark-collections';

const listCollectionsMock = vi.fn();

vi.mock('@/features/bookmarks/api', () => ({
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
const lookup = useBookmarkCollections();
return (
<div
data-testid='probe'
data-collections={JSON.stringify(
lookup.collections.map((c) => c.collectionId),
      )}
data-loading={String(lookup.isLoading)}
data-has-error={String(lookup.error !== null)}
    />
  );
}

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('useBookmarkCollections — unauthenticated', () => {
it('(a) returns an empty array without firing a fetch when isAuthenticated === false', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-collections')).toBe('[]');
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });
expect(listCollectionsMock).not.toHaveBeenCalled();
  });
});

describe('useBookmarkCollections — authenticated happy path', () => {
it('(b) populates the collections array from the listCollections endpoint', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });

listCollectionsMock.mockResolvedValue({
data: {
items: [
{
collectionId: uuidV7(1),
userId: uuidV7(2),
name: 'Favourites',
description: 'My favourite quizzes',
quizCount: 5,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
          },
{
collectionId: uuidV7(3),
userId: uuidV7(2),
name: 'History',
description: null,
quizCount: 2,
createdAt: '2026-07-15T00:00:00.000Z',
updatedAt: '2026-07-15T00:00:00.000Z',
          },
        ],
      },
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
const collections = JSON.parse(
probeEl.getAttribute('data-collections') ?? '[]',
      ) as string[];
expect(collections).toEqual([uuidV7(1), uuidV7(3)]);
expect(probeEl.getAttribute('data-loading')).toBe('false');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });

expect(listCollectionsMock).toHaveBeenCalledTimes(1);
  });
});

describe('useBookmarkCollections — empty server response', () => {
it('(c) returns an empty array for an empty server response, not an error', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
listCollectionsMock.mockResolvedValue({ data: { items: [] } });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-collections')).toBe('[]');
expect(probeEl.getAttribute('data-has-error')).toBe('false');
    });
  });
});

describe('useBookmarkCollections — error', () => {
it('(d) leaves the array empty and surfaces error when a fetch rejects', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });
listCollectionsMock.mockRejectedValue(new Error('401 Unauthorized'));

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-collections')).toBe('[]');
expect(probeEl.getAttribute('data-has-error')).toBe('true');
    });
  });
});

describe('useBookmarkCollections — SWR key', () => {
it('(e) the SWR key follows the documented shape', () => {
expect(bookmarkCollectionsKey()).toEqual(['bookmark-collections']);
  });
});