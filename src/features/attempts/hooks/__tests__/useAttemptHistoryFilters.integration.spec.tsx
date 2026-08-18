

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useAttemptHistoryFilters } from '@/features/attempts/hooks/useAttemptHistoryFilters';

const useSearchParamsMock = vi.fn();
const useRouterMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
useSearchParams: () => useSearchParamsMock(),
useRouter: () => useRouterMock(),
usePathname: () => '/quiz-history',
}));

function makeSearchParams(
init: Record<string, string> = {},
): URLSearchParams {
const params = new URLSearchParams();
for (const [key, value] of Object.entries(init)) {
params.set(key, value);
  }
return params;
}

beforeEach(() => {
useRouterMock.mockReturnValue({ replace: replaceMock });
replaceMock.mockReset();
useSearchParamsMock.mockReset();
});

afterEach(() => {
vi.clearAllMocks();
});

describe('useAttemptHistoryFilters - cursor seeding', () => {
it('seeds cursor from the URL on first render', () => {
useSearchParamsMock.mockReturnValue(
makeSearchParams({ status: 'completed', cursor: 'page-2-cursor' }),
    );

const { result } = renderHook(() => useAttemptHistoryFilters());

expect(result.current.filters.cursor).toBe('page-2-cursor');
  });

it('seeds defaults when the URL has no cursor', () => {
useSearchParamsMock.mockReturnValue(makeSearchParams());

const { result } = renderHook(() => useAttemptHistoryFilters());

expect(result.current.filters.cursor).toBeNull();
  });
});
