

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { SwrProvider } from '@/providers';

import { useCursorPaginated } from '@/lib/api/use-cursor-paginated';

type Item = { id: string; label: string };

const cursorFetcher = vi.fn();
const offsetFetcher = vi.fn();

beforeEach(() => {
cursorFetcher.mockReset();
cursorFetcher.mockResolvedValue({
items: [{ id: 'a', label: 'A' }] as Item[],
nextCursor: 'next',
hasNextPage: true,
limit: 1,
  });
offsetFetcher.mockReset();
offsetFetcher.mockResolvedValue({
items: [{ id: 'a', label: 'A' }] as Item[],
page: 1,
total: 1,
hasMore: false,
limit: 1,
  });
});

afterEach(() => {
vi.restoreAllMocks();
});

describe('useCursorPaginated — enabled flag', () => {
it('does NOT invoke the fetcher when `enabled` is `false` (cursor mode)', async () => {
const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['cursor-test', 'disabled'],
fetcher: cursorFetcher,
params: {},
paginationKind: 'cursor',
enabled: false,
        }),
{ wrapper: SwrProvider },
    );

await new Promise((r) => setTimeout(r, 50));

expect(cursorFetcher).not.toHaveBeenCalled();
expect(result.current.items).toEqual([]);
expect(result.current.error).toBeNull();
  });

it('invokes the fetcher when `enabled` is `true` (default, cursor mode)', async () => {
const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['cursor-test', 'enabled'],
fetcher: cursorFetcher,
params: {},
paginationKind: 'cursor',
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(cursorFetcher).toHaveBeenCalledTimes(1);
    });

expect(result.current.items).toEqual([{ id: 'a', label: 'A' }]);
  });

it('does NOT invoke the fetcher when `enabled` is `false` (offset mode)', async () => {
const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['offset-test', 'disabled'],
fetcher: offsetFetcher,
params: {},
paginationKind: 'offset',
enabled: false,
        }),
{ wrapper: SwrProvider },
    );

await new Promise((r) => setTimeout(r, 50));

expect(offsetFetcher).not.toHaveBeenCalled();
expect(result.current.items).toEqual([]);
expect(result.current.error).toBeNull();
  });
});
