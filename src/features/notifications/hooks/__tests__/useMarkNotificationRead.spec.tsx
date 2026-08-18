

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useMarkNotificationRead } from '@/features/notifications/hooks/useMarkNotificationRead';
import { ApiError, isApiError } from '@/lib/api';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockMarkNotificationRead = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
markNotificationRead: (...args: unknown[]) => mockMarkNotificationRead(...args),
}));

const mutateMock = vi.fn();
vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

function makeApiError(status: number, code: string) {
return new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: `Mock ${status}: ${code}`,
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
extensions: {
code,
        },
      },
    },
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function TestSwrProvider({ children }: { children: React.ReactNode }) {
return (
<SWRConfig
value={{
provider: () => new Map(),
revalidateOnFocus: false,
revalidateIfStale: false,
dedupingInterval: 0,
errorRetryCount: 0,
      }}
    >
{children}
</SWRConfig>
  );
}

describe('useMarkNotificationRead', () => {
beforeEach(() => {
vi.clearAllMocks();
mutateMock.mockResolvedValue(undefined);
mockGetFeatureFlagValue.mockReturnValue('live');
  });

afterEach(() => {
cleanup();
  });

describe('initialization', () => {
it('starts in idle state', () => {
const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });
expect(result.current.state).toBe('idle');
expect(result.current.error).toBeNull();
    });

it('marks read is a no-op when flag is placeholder', async () => {
mockGetFeatureFlagValue.mockReturnValue('placeholder');

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    });

it('marks read is a no-op when notificationId is null', async () => {
const { result } = renderHook(() => useMarkNotificationRead(null), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(mockMarkNotificationRead).not.toHaveBeenCalled();
    });
  });

describe('success path', () => {
it('transitions to success state and invalidates SWR keys', async () => {
mockMarkNotificationRead.mockResolvedValue(undefined);

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.state).toBe('success');
expect(mutateMock).toHaveBeenCalled();
    });

it('resets to idle after 1 second on success', async () => {
vi.useFakeTimers();
mockMarkNotificationRead.mockResolvedValue(undefined);

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.state).toBe('success');

await act(async () => {
vi.advanceTimersByTime(1100);
      });

expect(result.current.state).toBe('idle');

vi.useRealTimers();
    });

it('forwards the notification id to the service', async () => {
mockMarkNotificationRead.mockResolvedValue(undefined);

const { result } = renderHook(() => useMarkNotificationRead('notification-42'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(mockMarkNotificationRead).toHaveBeenCalledWith('notification-42');
    });
  });

describe('error handling', () => {
it('transitions to error state with NOTIFICATION_NOT_FOUND', async () => {
mockMarkNotificationRead.mockRejectedValue(makeApiError(404, 'NOTIFICATION_NOT_FOUND'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.state).toBe('error');
expect(result.current.error).not.toBeNull();
expect(isApiError(result.current.error!)).toBe(true);
expect(result.current.error?.code).toBe('NOTIFICATION_NOT_FOUND');
    });

it('transitions to error with NOTIFICATION_FORBIDDEN', async () => {
mockMarkNotificationRead.mockRejectedValue(makeApiError(403, 'NOTIFICATION_FORBIDDEN'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.error?.code).toBe('NOTIFICATION_FORBIDDEN');
    });

it('transitions to error with GLOBAL_UNAUTHENTICATED', async () => {
mockMarkNotificationRead.mockRejectedValue(makeApiError(401, 'GLOBAL_UNAUTHENTICATED'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.error?.code).toBe('GLOBAL_UNAUTHENTICATED');
    });

it('wraps plain error into ApiError', async () => {
mockMarkNotificationRead.mockRejectedValue(new Error('Network failure'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.state).toBe('error');
expect(isApiError(result.current.error!)).toBe(true);
    });
  });

describe('double-click guard', () => {
it('allows only one mutation call when invoked twice in flight', async () => {
let resolveMark: (value: unknown) => void;
mockMarkNotificationRead.mockImplementationOnce(
() =>
new Promise<unknown>((resolve) => {
resolveMark = resolve;
          }),
      );

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

const firstPromise = result.current.markRead();

await act(async () => {
await result.current.markRead();
      });

resolveMark!(undefined);
await firstPromise;

expect(mockMarkNotificationRead).toHaveBeenCalledTimes(1);
    });
  });

describe('no blind retry', () => {
it('does not auto-retry after an error', async () => {
mockMarkNotificationRead.mockRejectedValue(makeApiError(500, 'GLOBAL_INTERNAL_ERROR'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

await new Promise((resolve) => setTimeout(resolve, 10));
expect(mockMarkNotificationRead).toHaveBeenCalledTimes(1);
    });
  });

describe('reset', () => {
it('clears error and returns to idle', async () => {
mockMarkNotificationRead.mockRejectedValue(makeApiError(404, 'NOTIFICATION_NOT_FOUND'));

const { result } = renderHook(() => useMarkNotificationRead('n1'), {
wrapper: TestSwrProvider,
      });

await act(async () => {
await result.current.markRead();
      });

expect(result.current.state).toBe('error');

act(() => {
result.current.reset();
      });

expect(result.current.state).toBe('idle');
expect(result.current.error).toBeNull();
    });
  });
});
