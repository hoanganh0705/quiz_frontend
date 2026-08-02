/**
 * `useOptimisticToggle.spec.tsx` — locks the optimistic-with-rollback
 * contract for Phase 3 follow / unfollow mutations.
 *
 * Source epic:   Story 3.9 — Follow / unfollow for categories + tags.
 * Source ticket: TKT-3.9.B1.
 *
 * Eight cases per the ticket AC #1–12:
 *
 *   (a) Cooldown enforcement — the second call within 500 ms is
 *       dropped (the underlying `toggle` is not called twice).
 *   (b) Success path — every key in `keysToInvalidate` is invalidated
 *       via `mutate(key)`. `status` resolves to `'success'`,
 *       `lastError` is `null`.
 *   (c) 429 → `{ kind: 'http_429' }` — `lastError.kind` is `http_429`,
 *       `status` resolves to `'reverted'`. The cooldown is NOT lifted
 *       (a follow-up call within the window is dropped).
 *   (d) 404 → `{ kind: 'http_404' }` AND triggers `mutate` on the
 *       keys (entity was deleted server-side; the directory must
 *       re-fetch).
 *   (e) 5xx → `{ kind: 'http_5xx' }` and does NOT trigger `mutate`.
 *   (f) Non-`ApiError` rejection → `{ kind: 'unknown' }`.
 *   (g) `toggle` reference is stable across re-renders with the same
 *       inputs (memoised via `useCallback`).
 *   (h) Generic 4xx (e.g. 409) → `{ kind: 'http_4xx' }` and does NOT
 *       trigger `mutate`.
 *
 * Test-environment notes: the file lives under
 * `src/lib/api/__tests__/` so vitest's `jsdom` project picks it up
 * (configured in `vitest.config.ts`). The setupFile registers
 * `@testing-library/jest-dom` matchers and an `afterEach` `cleanup`
 * is registered globally. SWR's `mutate` is mocked at module level
 * via `vi.mock('swr', ...)` so the test captures the invalidation
 * calls without spinning up a real SWR cache.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { ApiError } from '@/lib/api';

// Mock SWR's global `mutate` so the test captures invalidation calls
// without spinning up a real SWR cache.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (a) Cooldown enforcement
// ---------------------------------------------------------------------------

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

    // First call — fires.
    await act(async () => {
      await result.current.toggle();
    });
    expect(toggleSpy).toHaveBeenCalledTimes(1);

    // Second call within the 500 ms window — dropped.
    await act(async () => {
      await result.current.toggle();
    });
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });

  it('allows a second call after `cooldownMs` elapses (configured via the param)', async () => {
    // The cooldown is measured via `performance.now()` — we cannot
    // easily stub that across all envs without stubbing `performance`.
    // The contract is locked via the B1 AC #3 behaviour above; we
    // also verify the override works at the contract level by
    // passing `cooldownMs: 0` so the second call passes the gate.
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

// ---------------------------------------------------------------------------
// (b) Success path — invalidates every key
// ---------------------------------------------------------------------------

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
    // Each call uses `mutate(key, undefined, { revalidate: true })`.
    for (const call of mutateMock.mock.calls) {
      expect(call[1]).toBeUndefined();
      expect(call[2]).toEqual({ revalidate: true });
    }
    expect(result.current.status).toBe('success');
    expect(result.current.lastError).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// (c) 429 → http_429, cooldown NOT lifted
// ---------------------------------------------------------------------------

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

    // A second call within the cooldown window is still dropped — the
    // B1 AC #5 contract is that 429 does NOT lift the cooldown.
    await act(async () => {
      await result.current.toggle();
    });
    expect(toggleSpy).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// (d) 404 → http_404 + invalidate
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (e) 5xx → http_5xx, no mutate
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (f) Non-ApiError → unknown
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (g) toggle reference stability
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// (h) Generic 4xx (e.g. 409) → http_4xx, no mutate
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Helper: classifyOptimisticToggleError
// ---------------------------------------------------------------------------

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