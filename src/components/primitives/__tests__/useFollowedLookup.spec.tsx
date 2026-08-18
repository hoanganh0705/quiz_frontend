

import type React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import {
FOLLOWED_LOOKUP_LIMIT,
followedCategoriesKey,
followedTagsKey,
useFollowedLookup,
} from '@/features/tags/hooks/useFollowedLookup';

const followedCategoriesMock = vi.fn();
const followedTagsMock = vi.fn();

vi.mock('@/features/categories/services/categories.service', () => ({
followedCategories: (...args: unknown[]) => followedCategoriesMock(...args),
}));

vi.mock('@/features/tags/services/tags.service', () => ({
followedTags: (...args: unknown[]) => followedTagsMock(...args),
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
const lookup = useFollowedLookup();
return (
<div
data-testid='probe'
data-categories={JSON.stringify(Array.from(lookup.categories))}
data-tags={JSON.stringify(Array.from(lookup.tags))}
data-loading={String(lookup.isLoading)}
data-has-error={String(lookup.error !== null)}
    />
  );
}

function CapturingProbe({ onCapture }: { onCapture: (lookup: ReturnType<typeof useFollowedLookup>) => void }) {
const lookup = useFollowedLookup();
onCapture(lookup);
return <div data-testid='capture' />;
}

afterEach(() => {
cleanup();
vi.clearAllMocks();
});

describe('useFollowedLookup — unauthenticated', () => {
it('(a) returns empty sets without firing fetches when isAuthenticated === false', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: false });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-categories')).toBe('[]');
expect(probeEl.getAttribute('data-tags')).toBe('[]');
    });
expect(followedCategoriesMock).not.toHaveBeenCalled();
expect(followedTagsMock).not.toHaveBeenCalled();
  });
});

describe('useFollowedLookup — authenticated happy path', () => {
it('(b) populates both sets from the me/followed endpoints', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });

followedCategoriesMock.mockResolvedValue({
data: [
{ categoryId: uuidV7(1), name: 'Science', slug: 'science', followedAt: '2026-07-01' },
{ categoryId: uuidV7(2), name: 'History', slug: 'history', followedAt: '2026-07-01' },
      ],
meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

followedTagsMock.mockResolvedValue({
data: [
{ tagId: uuidV7(3), name: 'physics', slug: 'physics', followedAt: '2026-07-01' },
      ],
meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
const categories = JSON.parse(probeEl.getAttribute('data-categories') ?? '[]') as string[];
const tags = JSON.parse(probeEl.getAttribute('data-tags') ?? '[]') as string[];
expect(categories).toEqual([uuidV7(1), uuidV7(2)]);
expect(tags).toEqual([uuidV7(3)]);
expect(probeEl.getAttribute('data-loading')).toBe('false');
    });

expect(followedCategoriesMock).toHaveBeenCalled();

expect(followedCategoriesMock.mock.calls[0]?.[0]).toEqual({ limit: FOLLOWED_LOOKUP_LIMIT });
expect(followedTagsMock).toHaveBeenCalled();
expect(followedTagsMock.mock.calls[0]?.[0]).toEqual({ limit: FOLLOWED_LOOKUP_LIMIT });
  });
});

describe('useFollowedLookup — error', () => {
it('(c) leaves both sets empty and surfaces error when a fetch rejects', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });

followedCategoriesMock.mockRejectedValue(new Error('401 Unauthorized'));
followedTagsMock.mockResolvedValue({
data: [],
meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

const { getByTestId } = render(<Probe />, { wrapper: TestSwrProvider });

await waitFor(() => {
const probeEl = getByTestId('probe');
expect(probeEl.getAttribute('data-categories')).toBe('[]');
expect(probeEl.getAttribute('data-tags')).toBe('[]');
expect(probeEl.getAttribute('data-has-error')).toBe('true');
    });
  });
});

describe('useFollowedLookup — mutate', () => {
it('(d) exposes a mutate function that fans out to both keys', async () => {
useAuthStateMock.mockReturnValue({ isAuthenticated: true });

followedCategoriesMock.mockResolvedValue({
data: [],
meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });
followedTagsMock.mockResolvedValue({
data: [],
meta: { pagination: { nextCursor: null, hasNextPage: false } },
    });

let lookupRef: ReturnType<typeof useFollowedLookup> | null = null;
const { getByTestId } = render(
<CapturingProbe onCapture={(l) => { lookupRef = l; }} />,
{ wrapper: TestSwrProvider },
    );

await waitFor(() => {
expect(followedCategoriesMock).toHaveBeenCalledTimes(1);
expect(followedTagsMock).toHaveBeenCalledTimes(1);
    });

expect(getByTestId('capture')).toBeInTheDocument();
expect(lookupRef).not.toBeNull();
const beforeCategoriesCalls = followedCategoriesMock.mock.calls.length;
const beforeTagsCalls = followedTagsMock.mock.calls.length;

await lookupRef!.mutate();

expect(followedCategoriesMock.mock.calls.length).toBe(beforeCategoriesCalls + 1);
expect(followedTagsMock.mock.calls.length).toBe(beforeTagsCalls + 1);
  });
});

describe('useFollowedLookup — SWR keys', () => {
it('(e) the SWR keys follow the documented shape', () => {
expect(followedCategoriesKey()).toEqual([
'follow-lookup',
'categories',
{ limit: FOLLOWED_LOOKUP_LIMIT },
    ]);
expect(followedTagsKey()).toEqual([
'follow-lookup',
'tags',
{ limit: FOLLOWED_LOOKUP_LIMIT },
    ]);
expect(FOLLOWED_LOOKUP_LIMIT).toBe(100);
  });
});