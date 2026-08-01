/**
 * `useSingleWithRetry.spec.tsx` — locks the single-resource retry contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.B1.
 *
 * Seven cases per the ticket AC #1–7:
 *
 *   (a) Success: the hook resolves the fetcher and exposes the data.
 *   (b) 429 backoff: the fetcher is retried with the 250 / 500 /
 *       1000 ms delays from the Story 3.2 policy, then surfaces the
 *       final typed error after the cap.
 *   (c) 404 / 422 no-auto-retry: 4xx errors surface immediately and
 *       the fetcher is called exactly once.
 *   (d) 5xx no-infinite-retry: 5xx errors surface immediately and
 *       the fetcher is called exactly once.
 *   (e) Manual `retry()` revalidates the same key and clears stale
 *       error state on success.
 *   (f) Race: an old key resolves after a new key — the old result
 *       is dropped; the new result is exposed.
 *   (g) Unmount: no React state-update warning is emitted.
 *
 * The hook performs its own fetch lifecycle (no SWR), so the tests
 * can be isolated to the hook without an `SwrProvider` wrapper. The
 * sleep function is injected so the 429 backoff assertions can run
 * with fake timers.
 *
 * Test-environment notes: the file lives under
 * `src/components/primitives/__tests__/` so vitest's `jsdom` project
 * picks it up (configured in `vitest.config.ts`). The setupFile
 * registers `@testing-library/jest-dom` matchers and an `afterEach`
 * `cleanup` is registered globally.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';

import { ApiError, useSingleWithRetry } from '@/lib/api';
import type {
  SingleFetcher,
  UseSingleWithRetryParams,
} from '@/lib/api/use-single-with-retry';

interface Payload {
  id: string;
  label: string;
}

function makeFetcherSpy() {
  const spy = vi.fn<SingleFetcher<Payload>>();
  return spy;
}

function makeResponse(
  id: string,
  label: string = 'ok',
): Payload {
  return { id, label };
}

function makeApiError(status: number, code: string = `CODE_${status}`): ApiError {
  return new ApiError({
    isAxiosError: true,
    response: {
      status,
      data: {
        type: 'about:blank',
        title: `Error ${status}`,
        status,
        code,
      },
    },
    config: undefined,
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function makeParams<T>(opts: Partial<UseSingleWithRetryParams<T>>): UseSingleWithRetryParams<T> {
  return {
    key: opts.key ?? ['unit', 'single'],
    fetcher: opts.fetcher ?? ((async () => ({} as T)) as SingleFetcher<T>),
    backoffDelaysMs: opts.backoffDelaysMs,
    revalidateOnFocus: opts.revalidateOnFocus,
    sleep: opts.sleep,
  };
}

function makeImmediateSleep(): (ms: number) => Promise<void> {
  return async () => Promise.resolve();
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('useSingleWithRetry — happy path', () => {
  it('(a) returns the resolved payload and exposes a null error', async () => {
    const fetcher = vi.fn(async () => makeResponse('quiz-1')) as SingleFetcher<Payload>;
    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(makeParams<Payload>({ fetcher })),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.data).toEqual({ id: 'quiz-1', label: 'ok' });
    expect(result.current.error).toBeNull();
    expect(result.current.isRetrying).toBe(false);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('useSingleWithRetry — 429 backoff', () => {
  it('(b) retries on 429 with the 250 / 500 / 1000 ms delays, then surfaces the typed error', async () => {
    const sleeps: number[] = [];
    const sleep = async (ms: number) => {
      sleeps.push(ms);
    };
    const fetcher = vi.fn(async () => {
      throw makeApiError(429, 'RATE_LIMITED');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(makeParams<Payload>({ fetcher, sleep })),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(sleeps).toEqual([250, 500, 1000]);
    // 1 initial attempt + 3 retries = 4 fetcher calls.
    expect(fetcher).toHaveBeenCalledTimes(4);
    expect(result.current.error?.status).toBe(429);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.isRetrying).toBe(false);
  });

  it('(b2) succeeds after a single 429 retry (only the 250 ms delay is consumed)', async () => {
    const sleeps: number[] = [];
    const sleep = async (ms: number) => {
      sleeps.push(ms);
    };
    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw makeApiError(429, 'RATE_LIMITED');
      }
      return makeResponse('quiz-after-retry');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(makeParams<Payload>({ fetcher, sleep })),
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(sleeps).toEqual([250]);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(result.current.data?.id).toBe('quiz-after-retry');
    expect(result.current.error).toBeNull();
  });
});

describe('useSingleWithRetry — non-429 4xx', () => {
  it('(c) 404 surfaces immediately and the fetcher is called exactly once', async () => {
    const fetcher = vi.fn(async () => {
      throw makeApiError(404, 'QUIZ_NOT_FOUND');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(
        makeParams<Payload>({ fetcher, sleep: makeImmediateSleep() }),
      ),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error?.status).toBe(404);
    expect(result.current.isLoading).toBe(false);
  });

  it('(c2) 422 follows the same no-retry policy as 404', async () => {
    const fetcher = vi.fn(async () => {
      throw makeApiError(422, 'VALIDATION');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(
        makeParams<Payload>({ fetcher, sleep: makeImmediateSleep() }),
      ),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error?.status).toBe(422);
  });
});

describe('useSingleWithRetry — 5xx', () => {
  it('(d) 500 surfaces immediately and the fetcher is called exactly once', async () => {
    const fetcher = vi.fn(async () => {
      throw makeApiError(500, 'INTERNAL');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(
        makeParams<Payload>({ fetcher, sleep: makeImmediateSleep() }),
      ),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(result.current.error?.status).toBe(500);
    expect(result.current.isLoading).toBe(false);
  });
});

describe('useSingleWithRetry — manual retry', () => {
  it('(e) retry() revalidates the same key and clears stale error on success', async () => {
    let callCount = 0;
    const fetcher = vi.fn(async () => {
      callCount += 1;
      if (callCount === 1) {
        throw makeApiError(500, 'INTERNAL');
      }
      return makeResponse('quiz-success');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(
        makeParams<Payload>({ fetcher, sleep: makeImmediateSleep() }),
      ),
    );

    await waitFor(() => {
      expect(result.current.error?.status).toBe(500);
    });

    await act(async () => {
      await result.current.retry();
    });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    expect(result.current.data?.id).toBe('quiz-success');
    expect(result.current.error).toBeNull();
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe('useSingleWithRetry — race', () => {
  it('(f) a stale key resolution is dropped when a new key resolves first', async () => {
    const pendingFirst: { resolve: (value: Payload) => void } = {
      resolve: () => undefined,
    };
    const pendingSecond: { resolve: (value: Payload) => void } = {
      resolve: () => undefined,
    };

    const fetcher = vi.fn<SingleFetcher<Payload>>(async () => {
      if (fetcher.mock.calls.length === 1) {
        return new Promise<Payload>((resolve) => {
          pendingFirst.resolve = resolve;
        });
      }
      return new Promise<Payload>((resolve) => {
        pendingSecond.resolve = resolve;
      });
    });

    const { result, rerender } = renderHook(
      ({ key }: { key: readonly string[] }) =>
        useSingleWithRetry<Payload>(
          makeParams<Payload>({
            key,
            fetcher,
            sleep: makeImmediateSleep(),
          }),
        ),
      { initialProps: { key: ['unit', 'race', 'first'] as readonly string[] } },
    );

    // The first key has fired but not resolved yet.
    await waitFor(() => {
      expect(fetcher).toHaveBeenCalledTimes(1);
    });

    // Switch to the new key.
    await act(async () => {
      rerender({ key: ['unit', 'race', 'second'] as readonly string[] });
    });

    // Resolve the second fetch.
    await act(async () => {
      pendingSecond.resolve(makeResponse('quiz-second'));
    });

    await waitFor(() => {
      expect(result.current.data?.id).toBe('quiz-second');
    });

    // Now resolve the stale first fetch. The hook MUST NOT overwrite
    // the new result.
    await act(async () => {
      pendingFirst.resolve(makeResponse('quiz-first-stale'));
    });

    // Allow microtasks to flush.
    await waitFor(() => {
      expect(result.current.data?.id).toBe('quiz-second');
    });

    expect(result.current.data?.id).toBe('quiz-second');
    expect(result.current.error).toBeNull();
  });
});

describe('useSingleWithRetry — unmount', () => {
  it('(g) does not emit a state-update warning when unmounted before resolution', async () => {
    const fetcher = vi.fn(
      async () =>
        new Promise<Payload>((resolve) => {
          setTimeout(() => resolve(makeResponse('quiz-after-unmount')), 100);
        }),
    ) as SingleFetcher<Payload>;

    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    const { unmount } = renderHook(() =>
      useSingleWithRetry<Payload>(makeParams<Payload>({ fetcher })),
    );

    unmount();

    // Allow the fake timeout to fire.
    await new Promise((resolve) => setTimeout(resolve, 150));

    const stateUpdateWarnings = consoleErrorSpy.mock.calls.filter((call) =>
      String(call[0] ?? '').includes(
        "Can't perform a React state update on an unmounted component",
      ),
    );
    expect(stateUpdateWarnings).toHaveLength(0);
  });
});

describe('useSingleWithRetry — primitive does not handle 404', () => {
  it('(B1 AC #7) does not expose a `notFound` derived state on 404', async () => {
    const fetcher = vi.fn(async () => {
      throw makeApiError(404, 'QUIZ_NOT_FOUND');
    }) as SingleFetcher<Payload>;

    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(
        makeParams<Payload>({ fetcher, sleep: makeImmediateSleep() }),
      ),
    );

    await waitFor(() => {
      expect(result.current.error).toBeInstanceOf(ApiError);
    });

    // The primitive deliberately exposes only `error` — consumers
    // (B2 / B3) decide whether to map 404 to a domain signal.
    const keys = Object.keys(result.current).sort();
    expect(keys).toEqual([
      'data',
      'error',
      'isLoading',
      'isRetrying',
      'retry',
    ]);
  });
});

describe('useSingleWithRetry — fetcher aborts', () => {
  it('passes an AbortSignal to the fetcher', async () => {
    const fetcher = vi.fn<SingleFetcher<Payload>>(async () => makeResponse('quiz-1'));
    const { result } = renderHook(() =>
      useSingleWithRetry<Payload>(makeParams<Payload>({ fetcher })),
    );

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    });

    const firstCall = fetcher.mock.calls[0];
    expect(firstCall?.[0]).toBeDefined();
    expect(firstCall?.[0].signal).toBeInstanceOf(AbortSignal);
  });
});

// `makeFetcherSpy` and `makeResponse` are exported only for type
// guard purposes; tests inside this file rely on them.
void makeFetcherSpy;
