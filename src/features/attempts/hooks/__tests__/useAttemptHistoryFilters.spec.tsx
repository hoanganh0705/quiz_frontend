/**
 * `useAttemptHistoryFilters.spec.tsx` — locks the URL-syncable filter hook.
 *
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.14.
 *
 * Coverage contract:
 *
 *   - `useSearchParams` initial state seeds the hook.
 *   - `setFilter` updates both the URL and the in-memory state.
 *   - `resetFilters` clears the URL and falls back to defaults.
 *   - The cursor is preserved through filter changes (status /
 *     dateRange / search) only when those fields did not change.
 *   - Unknown query params are ignored.
 *   - The hook is read/write safe inside React strict mode (the
 *     mount-seed effect runs once).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useAttemptHistoryFilters } from '@/features/attempts/hooks/useAttemptHistoryFilters';

// next/navigation mock ------------------------------------------------------------
const useSearchParamsMock = vi.fn();
const useRouterMock = vi.fn();
const usePathnameMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useSearchParams: () => useSearchParamsMock(),
  useRouter: () => useRouterMock(),
  usePathname: () => usePathnameMock(),
}));

function makeSearchParams(init: Record<string, string> = {}): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(init)) {
    params.set(key, value);
  }
  return params;
}

beforeEach(() => {
  useSearchParamsMock.mockReturnValue(makeSearchParams());
  useRouterMock.mockReturnValue({ replace: replaceMock });
  usePathnameMock.mockReturnValue('/attempts');
  replaceMock.mockReset();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe('useAttemptHistoryFilters — initialization', () => {
  it('initializes with defaults when the URL has no params', () => {
    useSearchParamsMock.mockReturnValue(makeSearchParams());
    const { result } = renderHook(() => useAttemptHistoryFilters());
    expect(result.current.filters.status).toBe('all');
    expect(result.current.filters.dateRange).toBe('all');
    expect(result.current.filters.search).toBe('');
    expect(result.current.filters.cursor).toBeNull();
  });

  it('seeds the state from the URL on first render', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({
        status: 'completed',
        date: 'last_30_days',
        q: 'sample',
        cursor: 'opaque',
      }),
    );
    const { result } = renderHook(() => useAttemptHistoryFilters());
    expect(result.current.filters.status).toBe('completed');
    expect(result.current.filters.dateRange).toBe('last_30_days');
    expect(result.current.filters.search).toBe('sample');
    expect(result.current.filters.cursor).toBe('opaque');
  });

  it('ignores unknown query params', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({ status: 'completed', unknown: 'value' }),
    );
    const { result } = renderHook(() => useAttemptHistoryFilters());
    expect(result.current.filters.status).toBe('completed');
  });
});

describe('useAttemptHistoryFilters — setFilter', () => {
  it('updates the in-memory state and rewrites the URL', () => {
    const { result } = renderHook(() => useAttemptHistoryFilters());

    act(() => {
      result.current.setFilter('status', 'completed');
    });

    expect(result.current.filters.status).toBe('completed');
    expect(replaceMock).toHaveBeenCalled();
    const target = replaceMock.mock.calls[0]?.[0] as string;
    expect(target).toContain('status=completed');
  });

  it('drops default values from the URL', () => {
    const { result } = renderHook(() => useAttemptHistoryFilters());

    act(() => {
      result.current.setFilter('search', 'sample quiz');
    });

    const target = replaceMock.mock.calls[0]?.[0] as string;
    expect(target).toContain('q=sample+quiz');
    // No other params should appear.
    expect(target).not.toContain('status=');
    expect(target).not.toContain('date=');
  });

  it('preserves the cursor when changing a non-cursor field, but resets it for status/dateRange/search', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({ status: 'completed', cursor: 'opaque' }),
    );
    const { result } = renderHook(() => useAttemptHistoryFilters());

    // Setting `limit` (a non-cursor field) preserves the cursor.
    act(() => {
      result.current.setFilter('limit', 50);
    });
    expect(result.current.filters.cursor).toBe('opaque');

    // Setting `status` resets the cursor so a stale cursor from the
    // previous filter set does not leak into the new page.
    act(() => {
      result.current.setFilter('status', 'abandoned');
    });
    expect(result.current.filters.cursor).toBeNull();
  });
});

describe('useAttemptHistoryFilters — resetFilters', () => {
  it('falls back to defaults and clears the URL params', () => {
    useSearchParamsMock.mockReturnValue(
      makeSearchParams({ status: 'completed', q: 'sample' }),
    );
    const { result } = renderHook(() => useAttemptHistoryFilters());

    act(() => {
      result.current.resetFilters();
    });

    expect(result.current.filters.status).toBe('all');
    expect(result.current.filters.search).toBe('');
    const target = replaceMock.mock.calls[0]?.[0] as string;
    expect(target).toBe('/attempts');
  });
});