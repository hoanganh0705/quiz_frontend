

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';

import { useTournamentFilters } from '@/features/tournaments/hooks/useTournamentFilters';

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
usePathnameMock.mockReturnValue('/tournaments');
replaceMock.mockReset();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('useTournamentFilters — initialization', () => {
it('initializes with defaults when the URL has no params', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams());
const { result } = renderHook(() => useTournamentFilters());
expect(result.current.filters.status).toBeUndefined();
expect(result.current.filters.search).toBe('');
expect(result.current.filters.cursor).toBeUndefined();
  });

it('seeds the state from the URL on first render', () => {
useSearchParamsMock.mockReturnValue(
makeSearchParams({
status: 'upcoming',
q: 'sample',
cursor: 'opaque',
      }),
    );
const { result } = renderHook(() => useTournamentFilters());
expect(result.current.filters.status).toBe('upcoming');
expect(result.current.filters.search).toBe('sample');
expect(result.current.filters.cursor).toBe('opaque');
  });

it('ignores unknown query params', () => {
useSearchParamsMock.mockReturnValue(
makeSearchParams({ status: 'ongoing', unknown: 'value' }),
    );
const { result } = renderHook(() => useTournamentFilters());
expect(result.current.filters.status).toBe('ongoing');
  });

it('ignores invalid status values', () => {
useSearchParamsMock.mockReturnValue(
makeSearchParams({ status: 'invalid_status' }),
    );
const { result } = renderHook(() => useTournamentFilters());
expect(result.current.filters.status).toBeUndefined();
  });
});

describe('useTournamentFilters — setFilter', () => {
it('updates the in-memory state and rewrites the URL', () => {
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.setFilter('status', 'ongoing');
    });

expect(result.current.filters.status).toBe('ongoing');
expect(replaceMock).toHaveBeenCalled();
const target = replaceMock.mock.calls[0]?.[0] as string;
expect(target).toContain('status=ongoing');
  });

it('status change resets the cursor', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams({ cursor: 'test-cursor' }));
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.setFilter('status', 'finished');
    });

expect(result.current.filters.cursor).toBeUndefined();
  });

it('search change resets the cursor', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams({ cursor: 'test-cursor' }));
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.setFilter('search', 'query');
    });

expect(result.current.filters.cursor).toBeUndefined();
  });
});

describe('useTournamentFilters — resetFilters', () => {
it('resets to defaults and clears URL', () => {
useSearchParamsMock.mockReturnValue(
makeSearchParams({ status: 'ongoing', q: 'test', cursor: 'abc' }),
    );
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.resetFilters();
    });

expect(result.current.filters.status).toBeUndefined();
expect(result.current.filters.search).toBe('');
expect(result.current.filters.cursor).toBeUndefined();
expect(replaceMock).toHaveBeenCalledWith('/tournaments');
  });
});

describe('useTournamentFilters — cursor management', () => {
it('setCursor updates the cursor without affecting status/search', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams({ status: 'upcoming', q: 'test' }));
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.setCursor('next-page');
    });

expect(result.current.filters.status).toBe('upcoming');
expect(result.current.filters.search).toBe('test');
expect(result.current.filters.cursor).toBe('next-page');
  });

it('clearCursor removes the cursor', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams({ cursor: 'test' }));
const { result } = renderHook(() => useTournamentFilters());

act(() => {
result.current.clearCursor();
    });

expect(result.current.filters.cursor).toBeUndefined();
  });
});
