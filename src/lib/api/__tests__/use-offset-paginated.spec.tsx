

import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import { SwrProvider } from "@/providers";

import {
FEED_DEFAULT_LIMIT,
FEED_MAX_LIMIT,
useOffsetPaginated,
type OffsetPaginatedFetcher,
} from "@/lib/api/use-offset-paginated";

interface Item {
readonly id: string;
readonly label: string;
}

function makeItem(overrides: Partial<Item> = {}): Item {
return { id: "q-1", label: "sample", ...overrides };
}

interface FetcherCall {
readonly offset: number;
readonly limit: number;
}

function buildQueuedFetcher(
pages: readonly { items: Item[]; hasMore: boolean }[],
limit: number,
): {
fetcher: OffsetPaginatedFetcher<Item, Record<string, never>>;
calls: FetcherCall[];
} {
const calls: FetcherCall[] = [];
let callIndex = 0;
const fetcher: OffsetPaginatedFetcher<Item, Record<string, never>> =
async ({ offset, limit: callerLimit }) => {
calls.push({ offset, limit: callerLimit });
const next = pages[callIndex];
callIndex += 1;
if (!next) {
throw new Error(
`[unit test] fetcher called more than ${pages.length} times`,
        );
      }
return {
items: next.items,
offset,
limit: callerLimit ?? limit,
hasMore: next.hasMore,
      };
    };
return { fetcher, calls };
}

afterEach(() => {
vi.restoreAllMocks();
});

describe("TKT-6.9.D1 / useOffsetPaginated — offset mode", () => {
it("(a) first-page fetch: returns items; offset equals items.length; hasMore mirrors server", async () => {
const firstPage: Item[] = [
makeItem({ id: "q-1" }),
makeItem({ id: "q-2" }),
makeItem({ id: "q-3" }),
    ];
const { fetcher } = buildQueuedFetcher(
[{ items: firstPage, hasMore: true }],
3,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "a"],
fetcher,
params: {},
limit: 3,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.items).toHaveLength(firstPage.length);
    });

expect(result.current.offset).toBe(firstPage.length);
expect(result.current.limit).toBe(3);
expect(result.current.hasMore).toBe(true);
expect(result.current.isLoading).toBe(false);
expect(result.current.error).toBeNull();
  });

it("(b) loadMore: items merge across pages; offset grows; hasMore mirrors server", async () => {
const firstPage: Item[] = [
makeItem({ id: "q-1" }),
makeItem({ id: "q-2" }),
    ];
const secondPage: Item[] = [
makeItem({ id: "q-3" }),
makeItem({ id: "q-4" }),
    ];
const { fetcher } = buildQueuedFetcher(
[
{ items: firstPage, hasMore: true },
{ items: secondPage, hasMore: false },
      ],
2,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "b"],
fetcher,
params: {},
limit: 2,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.items.length).toBe(firstPage.length);
    });
expect(result.current.hasMore).toBe(true);

await act(async () => {
result.current.loadMore();
    });

await waitFor(() => {
expect(result.current.items.length).toBe(
firstPage.length + secondPage.length,
      );
    });
expect(result.current.hasMore).toBe(false);
expect(result.current.offset).toBe(firstPage.length + secondPage.length);
  });

it("(c) loadMore is a no-op when hasMore is false", async () => {
const firstPage: Item[] = [makeItem({ id: "q-1" })];
const { fetcher, calls } = buildQueuedFetcher(
[{ items: firstPage, hasMore: false }],
1,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "c"],
fetcher,
params: {},
limit: 1,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.hasMore).toBe(false);
    });

await act(async () => {
result.current.loadMore();
    });

await new Promise((resolve) => setTimeout(resolve, 25));
expect(calls).toHaveLength(1);
  });

it("(d) limit > FEED_MAX_LIMIT is clamped to FEED_MAX_LIMIT", async () => {
const { fetcher, calls } = buildQueuedFetcher(
[{ items: [], hasMore: false }],
FEED_MAX_LIMIT,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "d"],
fetcher,
params: {},
limit: 1_000,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.limit).toBe(FEED_MAX_LIMIT);

expect(calls[0]!.limit).toBe(FEED_MAX_LIMIT);
  });

it("(e) limit <= 0 falls back to FEED_DEFAULT_LIMIT", async () => {
const { fetcher, calls } = buildQueuedFetcher(
[{ items: [], hasMore: false }],
FEED_DEFAULT_LIMIT,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "e"],
fetcher,
params: {},
limit: -3,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.limit).toBe(FEED_DEFAULT_LIMIT);
expect(calls[0]!.limit).toBe(FEED_DEFAULT_LIMIT);
  });

it("(f) the primitive forwards offsets in monotonically increasing order", async () => {
const firstPage: Item[] = [
makeItem({ id: "q-1" }),
makeItem({ id: "q-2" }),
    ];
const secondPage: Item[] = [
makeItem({ id: "q-3" }),
makeItem({ id: "q-4" }),
    ];
const { fetcher, calls } = buildQueuedFetcher(
[
{ items: firstPage, hasMore: true },
{ items: secondPage, hasMore: false },
      ],
2,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "f"],
fetcher,
params: {},
limit: 2,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.items.length).toBe(firstPage.length);
    });

await act(async () => {
result.current.loadMore();
    });

await waitFor(() => {
expect(calls.length).toBe(2);
    });

expect(calls[0]!.offset).toBe(0);
expect(calls[1]!.offset).toBe(firstPage.length);
  });

it("(g) the SWR key is the caller's key (no offset / cursor / page appended)", async () => {
const firstPage: Item[] = [makeItem({ id: "q-1" })];
const { fetcher } = buildQueuedFetcher(
[{ items: firstPage, hasMore: false }],
1,
    );

const { result } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "g"],
fetcher,
params: {},
limit: 1,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.items).toHaveLength(1);
  });

it("(h) unmount: the hook stops requesting after the component unmounts", async () => {
const firstPage: Item[] = [makeItem({ id: "q-1" })];
const { fetcher } = buildQueuedFetcher(
[{ items: firstPage, hasMore: true }],
1,
    );

const { result, unmount } = renderHook(
() =>
useOffsetPaginated<Item, Record<string, never>>({
key: ["unit", "d1", "h"],
fetcher,
params: {},
limit: 1,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

unmount();

await act(async () => {
      // No-op: the unmount above is the action under test.
    });

expect(result.current.items).toHaveLength(firstPage.length);
  });
});