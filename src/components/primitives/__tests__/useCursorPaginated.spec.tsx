/**
 * `useCursorPaginated` (cursor-mode) unit tests.
 *
 * Source epic:   Epic 3.2 — Cursor pagination primitive.
 * Source ticket: TKT-3.2.D2.
 *
 * Five cases (per D2 AC #2):
 *
 *   (a) single-page: hook returns one page's items, `hasMore: false`.
 *   (b) two-page no overlap: after `loadMore`, both pages' items appear,
 *       `hasMore: false`.
 *   (c) two-page cross-page overlap: dedup via `appendUniqueById`
 *       (the overlapping id appears exactly once).
 *   (d) `loadMore` while a fetch is in flight: items grow only after
 *       the in-flight fetch resolves (no premature append).
 *   (e) fetcher throws `ApiError` (built from the 404 fixture): the
 *       hook exposes it as `error` and `error.code === 'QUIZ_NOT_FOUND'`
 *       (the domain code the quiz 404 fixture carries per
 *       `EPIC_3_2_A1.md` §4).
 *
 * The hook is mounted inside a `<SwrProvider>` wrapper (per D2 AC #5)
 * so the test exercises the SWR-infinite + provider config end-to-end
 * without mocking `useSWRInfinite` directly.
 *
 * Test-environment notes (D2 AC #1):
 *
 *   - The file lives under `src/components/primitives/__tests__/` so
 *     vitest's `jsdom` project picks it up (configured in
 *     `vitest.config.ts`).
 *   - The tests use `@testing-library/react`'s `renderHook` directly
 *     because the hook must be rendered inside a `<SwrProvider>`
 *     wrapper — the existing `render-helpers` are scoped to primitives
 *     components.
 */

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

// ---------------------------------------------------------------------------
// Shared test fixtures
// ---------------------------------------------------------------------------

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

/**
 * Convert the `makeMultiPageCursorResponse` fixture (which uses
 * `{ id, pageIndex }`) into an `Item[]`-shaped array so the tests
 * exercise the hook's generic-`T` codepath with a realistic shape.
 */
function pagesAsItems(): readonly Item[][] {
  return makeMultiPageCursorResponse({ pages: 3, itemsPerPage: 2 }).map(
    (page) =>
      page.items.map((entry, i) => ({
        id: entry.id,
        label: `p${entry.pageIndex + 1}-${i + 1}`,
      })),
  );
}

/**
 * Build a fetcher that returns the next page from a precomputed queue.
 * Each queue entry is a `FixturePage` (or a rejected-promise sentinel
 * — see type).
 */
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

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

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
    // Synthetic overlap: the second page re-yields the first page's
    // last id, simulating the cursor-resume / cache-invalidation edge
    // case from Story 3.2 line 214.
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
    // The overlap id appears exactly once.
    const overlapCount = result.current.items.filter(
      (item) => item.id === overlapId,
    ).length;
    expect(overlapCount).toBe(1);
  });

  it("(d) loadMore while a fetch is in flight: items grow only after the in-flight fetch resolves", async () => {
    // The in-flight fetch is held by a deferred promise so the test can
    // observe the intermediate state.
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

    // Immediately after `loadMore`, the second page is in flight;
    // items.length must still be 1.
    await waitFor(() => {
      expect(calls).toBe(2);
    });
    expect(result.current.items.length).toBe(1);

    // Resolve the in-flight fetch — items must grow to 2.
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
    // The 404 fixture carries a domain-specific `QUIZ_NOT_FOUND` code
    // (per `EPIC_3_2_A1.md` §4 — Quiz endpoints emit domain codes, not
    // the synthesized `GLOBAL_*` codes).
    expect(result.current.error?.status).toBe(404);
    expect(result.current.error?.code).toBe("QUIZ_NOT_FOUND");
  });

  // D3 — offset-mode test (one new case per D3 AC #3).
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

    // Wait for the second page to be fetched and applied.
    await waitFor(
      () => {
        expect(result.current.items.length).toBe(6);
      },
      { timeout: 3000 }
    );
    // D3 AC #3: items grow by previousPageData.items.length.
    expect(result.current.items.length - page1.items.length).toBe(
      page1.items.length
    );
    expect(result.current.hasMore).toBe(false);
    expect(result.current.error).toBeNull();
    // Additional sanity: the fetcher was called twice (page 1, then page 2).
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  // D4 — race handling + AbortController (two new cases per D4 AC #3).
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

    // The fetcher is called 3 times total: initial p1, in-flight p2
    // (then aborted), and refreshed p1.
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

    // Fire loadMore (in-flight).
    act(() => {
      result.current.loadMore();
    });

    // Wait until the second fetcher call has been initiated (so we know
    // the AbortController has been registered against this in-flight call).
    await waitFor(() => {
      expect(calls).toBe(2);
    });

    // Fire refresh BEFORE the second page resolves. The race handling
    // should abort the in-flight loadMore.
    await act(async () => {
      await result.current.refresh();
    });

    // Now resolve the second page (it should be discarded — `refresh`
    // already moved on).
    await act(async () => {
      resolveSecondPage({
        items: secondPage,
        nextCursor: null,
        hasNextPage: false,
        limit: secondPage.length
      });
    });

    await waitFor(() => {
      // After refresh, items should contain only the post-refresh first page.
      expect(result.current.items.length).toBe(refreshedFirstPage.length);
    });
    // The 'r-3' item (from the discarded second page) must NOT be in items.
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

    // Wait until the first fetcher is in flight.
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });
    expect(result.current.isLoading).toBe(true);

    // Unmount mid-fetch — the cleanup `useEffect` should abort the
    // in-flight controller, and React should not warn about updates
    // after unmount.
    unmount();

    // Resolve the now-aborted fetcher call — if the hook attempted to
    // update state after unmount, `console.error` would log a warning.
    await act(async () => {
      resolvePage({
        items: [makeItem({ id: 'u-1' })],
        nextCursor: null,
        hasNextPage: false,
        limit: 1
      });
    });

    // React 18's "Can't perform a state update on an unmounted component"
    // warning is funneled through `console.error`. Our assert holds if
    // no such warning was logged.
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

  // D5 — 429 exponential-backoff + 5xx retry-banner (two new cases
  // per D5 AC #3).
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

    // The fetcher was called 3 times (two 429s + one success).
    expect(fetcher).toHaveBeenCalledTimes(3);
    // Validate the backoff delays (D5 AC #1 — ± 50 ms tolerance).
    const deltas = attemptTimestamps
      .slice(1)
      .map((t, i) => t - (attemptTimestamps[i] ?? 0));
    expect(deltas[0]).toBeGreaterThanOrEqual(250 - 50);
    expect(deltas[0]).toBeLessThanOrEqual(250 + 50);
    expect(deltas[1]).toBeGreaterThanOrEqual(500 - 50);
    expect(deltas[1]).toBeLessThanOrEqual(500 + 50);
    // The error did NOT surface because the third attempt succeeded.
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
    // The 5xx branch does NOT retry (D5 AC #2).
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  // D6 — cursor-decode Sentry capture (one new case per D6 AC #2).
  // Asserts: a fetcher returning a malformed `nextCursor` triggers
  // `captureException` exactly once, the cursor resets to null, and
  // the hook returns to the first-page state.
  it("(k) malformed cursor path: captureException is called once and fetcher is re-invoked with null cursor", async () => {
    const fetcher = vi.fn(
      async (args: { cursor: string | null; params: unknown }) => {
        if (args.cursor === null) {
          // First call — return a page whose nextCursor is malformed.
          return {
            items: [makeItem({ id: "p-1" })],
            nextCursor: "!!!not-base64!!!",
            hasNextPage: true,
            limit: 1
          };
        }
        // Subsequent calls (after the decoder throws and resets the
        // cursor to null) — return an empty page.
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
        // Don't delegate to the original (the spy IS the original
        // binding in vitest's module mock system — delegation would
        // create an infinite loop).
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

    // Wait for the first page to be returned.
    await waitFor(() => {
      expect(result.current.items.length).toBe(1);
    });

    // loadMore → second fetcher call with cursor=`!!!not-base64!!!`.
    // Decoder throws → captureException called + reset to null cursor.
    await act(async () => {
      result.current.loadMore();
    });

    await waitFor(() => {
      expect(captureCalls).toBeGreaterThanOrEqual(1);
    });

    // D6 AC #2: captureException is called exactly once for the
    // single malformed-cursor observation.
    expect(captureCalls).toBe(1);
    // D6 AC #1: the captured context has the expected tags.
    expect(lastCaptureContext?.tags?.surface).toBe('useCursorPaginated');
    expect(lastCaptureContext?.tags?.reason).toBe('cursor-decode');
    // D6 AC #2: the cursor was reset to null and the fetcher was
    // re-invoked with `cursor: null`. The malformed cursor never
    // reaches the fetcher directly; the decoder catches it BEFORE
    // the fetcher sees it, and the hook calls the fetcher with
    // `cursor: null` instead (the reset path).
    const callArgs = fetcher.mock.calls.map(
      (c) => (c[0] as { cursor: string | null }).cursor
    );
    // First call: null (initial first page).
    expect(callArgs[0]).toBeNull();
    // Second call (the decoder reset path): null. The malformed
    // value never reaches the fetcher — that's the whole point of
    // the decode guard.
    expect(callArgs[1]).toBeNull();
    // The hook returns to the first-page state.
    expect(result.current.isLoading).toBe(false);

    captureSpy.mockRestore();
  });

  // D7 — SSR fallbackData (one new case per D7 AC #3).
  // Renders the hook with `fallbackData` set; the hook must populate
  // `items` synchronously from the seed (D7 AC #1) without calling the
  // fetcher on first render.
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

    // Wait for the hook to settle (it should not fetch).
    await waitFor(() => {
      expect(result.current.items.length).toBe(fallbackItems.length);
    });
    // The hook's first paint comes from the seed — items.length must
    // match `fallbackItems.length`, NOT be empty.
    expect(result.current.items).toHaveLength(fallbackItems.length);
    expect(result.current.hasMore).toBe(true);
    // D7 AC #3 — fetcher was called 0 times on first render.
    expect(fetcher).toHaveBeenCalledTimes(0);
  });
});
