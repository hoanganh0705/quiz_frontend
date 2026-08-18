

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';

const mutateMock = vi.fn();
vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

import {
classifyOptimisticToggleError,
useOptimisticToggle,
} from '@/lib/api/useOptimisticToggle';

function makeApiError(status: number, code: string = `CODE_${status}`): ApiError {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}`,
code,
config: undefined,
request: undefined,
response: {
status,
data: {
type: 'about:blank',
title: `Error ${status}`,
status,
code,
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function flushMicrotasks(): Promise<void> {
return new Promise<void>((resolve) => {
setTimeout(resolve, 0);
  });
}

afterEach(() => {
vi.clearAllMocks();
mutateMock.mockReset();
});

describe('useOptimisticToggle — cooldown', () => {
it('(a) drops the second call within 500 ms; the underlying toggle fires once', async () => {
const toggleSpy = vi.fn(async () => undefined);
const keys: readonly unknown[][] = [['follow-lookup', 'categories']];

const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
keysToInvalidate: keys,
      }),
    );

await act(async () => {
await result.current.toggle();
    });
expect(toggleSpy).toHaveBeenCalledTimes(1);

await act(async () => {
await result.current.toggle();
    });
expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

it('allows a second call after `cooldownMs` elapses (configured via the param)', async () => {

const toggleSpy = vi.fn(async () => undefined);
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
cooldownMs: 0,
keysToInvalidate: [],
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await result.current.toggle();
    });

expect(toggleSpy).toHaveBeenCalledTimes(2);
  });
});

describe('useOptimisticToggle — success path', () => {
it('(b) invalidates every key in `keysToInvalidate` and resolves to `status: success`', async () => {
const toggleSpy = vi.fn(async () => undefined);
const keys: readonly unknown[][] = [
['follow-lookup', 'categories', { limit: 500 }],
['category', '0192f4d8-0000-7000-8000-000000000001'],
    ];

const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
keysToInvalidate: keys,
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(toggleSpy).toHaveBeenCalledTimes(1);
expect(mutateMock).toHaveBeenCalledTimes(2);

for (const call of mutateMock.mock.calls) {
expect(call[1]).toBeUndefined();
expect(call[2]).toEqual({ revalidate: true });
    }
expect(result.current.status).toBe('success');
expect(result.current.lastError).toBeNull();
  });
});

describe('useOptimisticToggle — 429 revert', () => {
it('(c) maps ApiError(429) to { kind: http_429 } and does not lift the cooldown', async () => {
const toggleSpy = vi.fn(async () => {
throw makeApiError(429, 'GLOBAL_RATE_LIMITED');
    });
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
keysToInvalidate: [],
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(result.current.status).toBe('reverted');
expect(result.current.lastError).not.toBeNull();
expect(result.current.lastError?.kind).toBe('http_429');
expect(mutateMock).not.toHaveBeenCalled();

await act(async () => {
await result.current.toggle();
    });
expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});

describe('useOptimisticToggle — 404 revert', () => {
it('(d) maps ApiError(404) to { kind: http_404 } AND triggers mutate on every key', async () => {
const toggleSpy = vi.fn(async () => {
throw makeApiError(404, 'CATEGORY_NOT_FOUND');
    });
const keys: readonly unknown[][] = [
['follow-lookup', 'categories', { limit: 500 }],
['category', '0192f4d8-0000-7000-8000-000000000099'],
    ];
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: true,
toggle: toggleSpy,
keysToInvalidate: keys,
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(result.current.status).toBe('reverted');
expect(result.current.lastError?.kind).toBe('http_404');
expect(mutateMock).toHaveBeenCalledTimes(2);
  });
});

describe('useOptimisticToggle — 5xx revert', () => {
it('(e) maps ApiError(5xx) to { kind: http_5xx } and does NOT invalidate', async () => {
const toggleSpy = vi.fn(async () => {
throw makeApiError(500, 'GLOBAL_INTERNAL_ERROR');
    });
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
keysToInvalidate: [['follow-lookup', 'categories']],
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(result.current.status).toBe('reverted');
expect(result.current.lastError?.kind).toBe('http_5xx');
expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe('useOptimisticToggle — non-ApiError revert', () => {
it('(f) maps a non-ApiError rejection (e.g. TypeError) to { kind: unknown }', async () => {
const toggleSpy = vi.fn(async () => {
throw new TypeError('network down');
    });
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: false,
toggle: toggleSpy,
keysToInvalidate: [],
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(result.current.status).toBe('reverted');
expect(result.current.lastError?.kind).toBe('unknown');
expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe('useOptimisticToggle — toggle reference stability', () => {
it('(g) the returned `toggle` reference is stable across re-renders with the same inputs', async () => {
const toggleSpy = vi.fn(async () => undefined);
const keys: readonly unknown[][] = [['follow-lookup', 'categories']];

const { result, rerender } = renderHook(
({ currentValue }) =>
useOptimisticToggle({
currentValue,
toggle: toggleSpy,
keysToInvalidate: keys,
        }),
{ initialProps: { currentValue: false as boolean } },
    );

const firstRef = result.current.toggle;
rerender({ currentValue: false });
const secondRef = result.current.toggle;

expect(secondRef).toBe(firstRef);
  });
});

describe('useOptimisticToggle — generic 4xx revert', () => {
it('(h) maps ApiError(409) to { kind: http_4xx } and does NOT invalidate', async () => {
const toggleSpy = vi.fn(async () => {
throw makeApiError(409, 'GLOBAL_CONFLICT');
    });
const { result } = renderHook(() =>
useOptimisticToggle({
currentValue: true,
toggle: toggleSpy,
keysToInvalidate: [['follow-lookup', 'categories']],
      }),
    );

await act(async () => {
await result.current.toggle();
    });
await act(async () => {
await flushMicrotasks();
    });

expect(result.current.status).toBe('reverted');
expect(result.current.lastError?.kind).toBe('http_4xx');
expect(mutateMock).not.toHaveBeenCalled();
  });
});

describe('classifyOptimisticToggleError', () => {
it('classifies 429 → http_429', () => {
expect(classifyOptimisticToggleError(makeApiError(429)).kind).toBe('http_429');
  });

it('classifies 404 → http_404', () => {
expect(classifyOptimisticToggleError(makeApiError(404)).kind).toBe('http_404');
  });

it('classifies 500 → http_5xx', () => {
expect(classifyOptimisticToggleError(makeApiError(500)).kind).toBe('http_5xx');
  });

it('classifies 409 → http_4xx (not 5xx, not unknown)', () => {
expect(classifyOptimisticToggleError(makeApiError(409)).kind).toBe('http_4xx');
  });

it('classifies a TypeError → unknown', () => {
expect(classifyOptimisticToggleError(new TypeError('net')).kind).toBe('unknown');
  });

it('classifies a string → unknown', () => {
expect(classifyOptimisticToggleError('boom').kind).toBe('unknown');
  });
});