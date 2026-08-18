

import { afterEach, describe, expect, it, vi } from "vitest";

import { act, renderHook, waitFor } from "@testing-library/react";

import { SwrProvider } from "@/providers";

import { ApiError, useCursorPaginated } from "@/lib/api";
import type {
CursorFetcher,
OffsetFetcher,
} from "@/lib/api/use-cursor-paginated.types";
import {
makeApiErrorFromFixture,
makeMultiPageCursorResponse,
} from "@/lib/api/__fixtures__/cursor-pagination";

interface Item {
id: string;
label: string;
}

function makeItem(overrides: Partial<Item> = {}): Item {
return { id: "q-1", label: "sample", ...overrides };
}

interface FixturePage {
items: Item[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
}

function makeFixturePage(
items: Item[],
hasNextPage: boolean,
nextCursor: string | null,
): FixturePage {
return { items, hasNextPage, nextCursor, limit: items.length };
}

function pagesAsItems(): readonly Item[][] {
return makeMultiPageCursorResponse({ pages: 3, itemsPerPage: 2 }).map(
(page) =>
page.items.map((entry, i) => ({
id: entry.id,
label: `p${entry.pageIndex + 1}-${i + 1}`,
      })),
  );
}

function buildQueuedFetcher(
pages: readonly FixturePage[],
): CursorFetcher<Item, Record<string, never>> {
let callIndex = 0;
return async () => {
const next = pages[callIndex];
callIndex += 1;
if (!next) {
throw new Error(
`[unit test] fetcher called more than ${pages.length} times`,
      );
    }
return next;
  };
}

afterEach(() => {
vi.restoreAllMocks();
});

describe("TKT-3.2.D2 / useCursorPaginated — cursor mode", () => {
it("(a) single-page: returns the page items; hasMore is false after the first page", async () => {
const [firstPage] = pagesAsItems();
if (!firstPage) throw new Error("fixture empty");

const fetcher = buildQueuedFetcher([
makeFixturePage(firstPage, false, null),
    ]);

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "a"],
paginationKind: "cursor",
params: {},
fetcher,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.items).toHaveLength(firstPage.length);
expect(result.current.hasMore).toBe(false);
expect(result.current.error).toBeNull();
  });

it("(b) two-page no overlap: after loadMore, the merged items have both pages, hasMore is false", async () => {
const [firstPage, secondPage] = pagesAsItems();
if (!firstPage || !secondPage) throw new Error("fixture empty");

const fetcher = buildQueuedFetcher([
makeFixturePage(firstPage, true, "cursor-2"),
makeFixturePage(secondPage, false, null),
    ]);

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "b"],
paginationKind: "cursor",
params: {},
fetcher,
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
expect(result.current.error).toBeNull();
  });

it("(c) two-page cross-page overlap: dedup via appendUniqueById (overlapping id appears once)", async () => {

const overlapId = "q-overlap";
const firstPage: Item[] = [
makeItem({ id: "q-1" }),
makeItem({ id: overlapId }),
    ];
const secondPage: Item[] = [
makeItem({ id: overlapId }),
makeItem({ id: "q-new" }),
    ];

const fetcher = buildQueuedFetcher([
makeFixturePage(firstPage, true, "cursor-2"),
makeFixturePage(secondPage, false, null),
    ]);

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "c"],
paginationKind: "cursor",
params: {},
fetcher,
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
expect(result.current.items.length).toBe(3); // 2 + 2 - 1 overlap
    });

const overlapCount = result.current.items.filter(
(item) => item.id === overlapId,
    ).length;
expect(overlapCount).toBe(1);
  });

it("(d) loadMore while a fetch is in flight: items grow only after the in-flight fetch resolves", async () => {

let resolveSecond!: (value: FixturePage) => void;
const secondPagePromise = new Promise<FixturePage>((resolve) => {
resolveSecond = resolve;
    });

const firstPage: FixturePage = makeFixturePage(
[makeItem({ id: "q-1" })],
true,
"cursor-2",
    );
const secondPageShape: FixturePage = makeFixturePage(
[makeItem({ id: "q-2" })],
false,
null,
    );

let calls = 0;
const fetcher: CursorFetcher<Item, Record<string, never>> = async () => {
calls += 1;
if (calls === 1) return firstPage;
return secondPagePromise;
    };

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "d"],
paginationKind: "cursor",
params: {},
fetcher,
        }),
{ wrapper: SwrProvider },
    );

await waitFor(() => {
expect(result.current.items.length).toBe(1);
    });

act(() => {
result.current.loadMore();
    });

await waitFor(() => {
expect(calls).toBe(2);
    });
expect(result.current.items.length).toBe(1);

await act(async () => {
resolveSecond(secondPageShape);
    });

await waitFor(() => {
expect(result.current.items.length).toBe(2);
    });
  });

it("(e) fetcher throws an ApiError (404 fixture): hook exposes it as `error`", async () => {
const apiError = makeApiErrorFromFixture("404-not-found");

const fetcher: CursorFetcher<Item, Record<string, never>> = async () => {
throw apiError;
    };

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "e"],
paginationKind: "cursor",
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(result.current.error).not.toBeNull();
    });

expect(result.current.error).toBeInstanceOf(ApiError);

expect(result.current.error?.status).toBe(404);
expect(result.current.error?.code).toBe("QUIZ_NOT_FOUND");
  });

it("(f) offset mode: items grow by previousPageData.items.length after loadMore", async () => {
interface OffsetFixturePage {
items: Item[];
page: number;
total: number;
hasMore: boolean;
limit: number;
    }

const page1: OffsetFixturePage = {
items: [
makeItem({ id: "t-1" }),
makeItem({ id: "t-2" }),
makeItem({ id: "t-3" })
      ],
page: 1,
total: 6,
hasMore: true,
limit: 3
    };

const page2: OffsetFixturePage = {
items: [
makeItem({ id: "t-4" }),
makeItem({ id: "t-5" }),
makeItem({ id: "t-6" })
      ],
page: 2,
total: 6,
hasMore: false,
limit: 3
    };

const fetcher = vi.fn(async ({ page }: { page: number }) => {
if (page === 1) return page1;
if (page === 2) return page2;
throw new Error(`[unit test] unexpected page ${page}`);
    }) as unknown as OffsetFetcher<Item, Record<string, never>>;

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "f-offset"],
paginationKind: "offset",
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(result.current.isLoading).toBe(false);
    });

expect(result.current.items.length).toBe(page1.items.length);
expect(result.current.hasMore).toBe(true);

await act(async () => {
result.current.loadMore();
    });

await waitFor(
() => {
expect(result.current.items.length).toBe(6);
      },
{ timeout: 3000 }
    );

expect(result.current.items.length - page1.items.length).toBe(
page1.items.length
    );
expect(result.current.hasMore).toBe(false);
expect(result.current.error).toBeNull();

expect(fetcher).toHaveBeenCalledTimes(2);
  });

it("(g) loadMore + refresh race: refresh aborts the in-flight loadMore; items contain only the post-refresh first page", async () => {
const initialPage: Item[] = [makeItem({ id: 'r-1' }), makeItem({ id: 'r-2' })];
const secondPage: Item[] = [makeItem({ id: 'r-3' })];
const refreshedFirstPage: Item[] = [makeItem({ id: 'r-1' })];

let resolveSecondPage!: (value: {
items: Item[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
    }) => void;
const secondPagePromise = new Promise<{
items: Item[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
    }>((resolve) => {
resolveSecondPage = resolve;
    });

let calls = 0;
const fetcher = vi.fn(
async () => {
calls += 1;
if (calls === 1) {
return {
items: initialPage,
nextCursor: 'cursor-2',
hasNextPage: true,
limit: initialPage.length
          };
        }
if (calls === 2) {
return secondPagePromise;
        }
if (calls === 3) {
return {
items: refreshedFirstPage,
nextCursor: null,
hasNextPage: false,
limit: refreshedFirstPage.length
          };
        }
throw new Error(`[unit test] unexpected call #${calls}`);
      }
    );

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['unit', 'g-race'],
paginationKind: 'cursor',
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(result.current.items.length).toBe(initialPage.length);
    });
expect(result.current.hasMore).toBe(true);

act(() => {
result.current.loadMore();
    });

await waitFor(() => {
expect(calls).toBe(2);
    });

await act(async () => {
await result.current.refresh();
    });

await act(async () => {
resolveSecondPage({
items: secondPage,
nextCursor: null,
hasNextPage: false,
limit: secondPage.length
      });
    });

await waitFor(() => {

expect(result.current.items.length).toBe(refreshedFirstPage.length);
    });

expect(
result.current.items.find((item) => item.id === 'r-3')
    ).toBeUndefined();
  });

it("(h) unmount mid-fetch: no React warning; no state update after unmount", async () => {
let resolvePage!: (value: {
items: Item[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
    }) => void;
const pagePromise = new Promise<{
items: Item[];
nextCursor: string | null;
hasNextPage: boolean;
limit: number;
    }>((resolve) => {
resolvePage = resolve;
    });

const fetcher = vi.fn(async () => pagePromise);

const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

const { result, unmount } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['unit', 'h-unmount'],
paginationKind: 'cursor',
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(fetcher).toHaveBeenCalledTimes(1);
    });
expect(result.current.isLoading).toBe(true);

unmount();

await act(async () => {
resolvePage({
items: [makeItem({ id: 'u-1' })],
nextCursor: null,
hasNextPage: false,
limit: 1
      });
    });

const reactUnmountWarnings = errorSpy.mock.calls.filter((args) =>
args.some(
(a) =>
typeof a === 'string' &&
a.includes("Can't perform a state update on an unmounted component")
      )
    );
expect(reactUnmountWarnings).toHaveLength(0);
errorSpy.mockRestore();
  });

it("(i) 429 backoff: three attempts (250/500/1000 ms); success on the third; hook returns the page", async () => {
const successPage = {
items: [makeItem({ id: 'rate-1' })],
nextCursor: null,
hasNextPage: false,
limit: 1
    };

let calls = 0;
const attemptTimestamps: number[] = [];
const fetcher = vi.fn(
async () => {
calls += 1;
attemptTimestamps.push(Date.now());
if (calls < 3) {
throw ApiError.fromAxios({
response: {
data: { status: 429, title: 'Too Many Requests' },
status: 429,
statusText: 'Too Many Requests',
headers: {},
config: {} as never
            },
message: 'too many',
isAxiosError: true,
name: 'AxiosError',
toJSON: () => ({})
          } as never);
        }
return successPage;
      }
    );

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['unit', 'i-rate'],
paginationKind: 'cursor',
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(
() => {
expect(result.current.items.length).toBe(successPage.items.length);
      },
{ timeout: 5_000 }
    );

expect(fetcher).toHaveBeenCalledTimes(3);

const deltas = attemptTimestamps
      .slice(1)
      .map((t, i) => t - (attemptTimestamps[i] ?? 0));
expect(deltas[0]).toBeGreaterThanOrEqual(250 - 50);
expect(deltas[0]).toBeLessThanOrEqual(250 + 50);
expect(deltas[1]).toBeGreaterThanOrEqual(500 - 50);
expect(deltas[1]).toBeLessThanOrEqual(500 + 50);

expect(result.current.error).toBeNull();
  });

it("(j) 5xx on first attempt: hook surfaces error AND retryBannerVisible is true", async () => {
const apiError = ApiError.fromAxios({
response: {
data: { status: 500, title: 'Internal Server Error' },
status: 500,
statusText: 'Internal Server Error',
headers: {},
config: {} as never
      },
message: 'server down',
isAxiosError: true,
name: 'AxiosError',
toJSON: () => ({})
    } as never);

const fetcher = vi.fn(
async () => {
throw apiError;
      }
    );

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ['unit', 'j-5xx'],
paginationKind: 'cursor',
params: {},
fetcher
        }),
{ wrapper: SwrProvider }
    );

await waitFor(
() => {
expect(result.current.error).not.toBeNull();
expect(result.current.retryBannerVisible).toBe(true);
      },
{ timeout: 5_000 }
    );

expect(result.current.error).toBeInstanceOf(ApiError);
expect(result.current.error?.status).toBe(500);

expect(fetcher).toHaveBeenCalledTimes(1);
  });

it("(k) malformed cursor path: captureException is called once and fetcher is re-invoked with null cursor", async () => {
const fetcher = vi.fn(
async (args: { cursor: string | null; params: unknown }) => {
if (args.cursor === null) {

return {
items: [makeItem({ id: "p-1" })],
nextCursor: "!!!not-base64!!!",
hasNextPage: true,
limit: 1
          };
        }

return {
items: [],
nextCursor: null,
hasNextPage: false,
limit: 0
        };
      }
    );

const sentryModule = await import(
"@/lib/observability/sentry-capture"
    );
let captureCalls = 0;
let lastCaptureContext:
| Parameters<typeof sentryModule.captureException>[1]
      | undefined;
const captureSpy = vi
      .spyOn(sentryModule, "captureException")
      .mockImplementation((err, context) => {
captureCalls += 1;
lastCaptureContext = context;

void err;
      });

const cursorDecoder = vi.fn((cursor: string) => {
if (cursor === "!!!not-base64!!!") {
throw new Error("malformed cursor: " + cursor);
      }
    });

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "k-decode"],
paginationKind: "cursor",
params: {},
fetcher,
cursorDecoder
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(result.current.items.length).toBe(1);
    });

await act(async () => {
result.current.loadMore();
    });

await waitFor(() => {
expect(captureCalls).toBeGreaterThanOrEqual(1);
    });

expect(captureCalls).toBe(1);

expect(lastCaptureContext?.tags?.surface).toBe('useCursorPaginated');
expect(lastCaptureContext?.tags?.reason).toBe('cursor-decode');

const callArgs = fetcher.mock.calls.map(
(c) => (c[0] as { cursor: string | null }).cursor
    );

expect(callArgs[0]).toBeNull();

expect(callArgs[1]).toBeNull();

expect(result.current.isLoading).toBe(false);

captureSpy.mockRestore();
  });

it("(l) SSR fallback: hook reads fallbackData on first paint; fetcher is not called", async () => {
const fallbackItems: Item[] = [
makeItem({ id: "ssr-1" }),
makeItem({ id: "ssr-2" }),
makeItem({ id: "ssr-3" })
    ];
const fetcher = vi.fn(async () => {
throw new Error("[unit test] fetcher should not be called when fallbackData is present");
    });

const { result } = renderHook(
() =>
useCursorPaginated<Item, Record<string, never>>({
key: ["unit", "l-ssr"],
paginationKind: "cursor",
params: {},
fetcher,
fallbackData: {
items: fallbackItems,
nextCursor: "c-2",
hasNextPage: true
          }
        }),
{ wrapper: SwrProvider }
    );

await waitFor(() => {
expect(result.current.items.length).toBe(fallbackItems.length);
    });

expect(result.current.items).toHaveLength(fallbackItems.length);
expect(result.current.hasMore).toBe(true);

expect(fetcher).toHaveBeenCalledTimes(0);
  });
});
