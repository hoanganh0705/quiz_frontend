

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

await waitFor(() => {
expect(fetcher).toHaveBeenCalledTimes(1);
    });

await act(async () => {
rerender({ key: ['unit', 'race', 'second'] as readonly string[] });
    });

await act(async () => {
pendingSecond.resolve(makeResponse('quiz-second'));
    });

await waitFor(() => {
expect(result.current.data?.id).toBe('quiz-second');
    });

await act(async () => {
pendingFirst.resolve(makeResponse('quiz-first-stale'));
    });

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

void makeFetcherSpy;
