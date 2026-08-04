/**
 * `useMarkNotificationUnread.spec.tsx` — locks the mark-unread mutation hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.G1.
 *
 * Tests cover:
 * - success path: state transitions, SWR keys invalidated
 * - error path: typed ApiError surfaces (NOTIFICATION_NOT_FOUND, UNAUTHORIZED)
 * - feature flag placeholder: no service call fires
 * - null notificationId: no service call fires
 * - double-click guard
 * - reset
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useMarkNotificationUnread } from '@/features/notifications/hooks/useMarkNotificationUnread';
import { ApiError, isApiError } from '@/lib/api';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockMarkNotificationUnread = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
  markNotificationUnread: (...args: unknown[]) => mockMarkNotificationUnread(...args),
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

describe('useMarkNotificationUnread', () => {
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
      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });
      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('marks unread is a no-op when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(mockMarkNotificationUnread).not.toHaveBeenCalled();
    });

    it('marks unread is a no-op when notificationId is null', async () => {
      const { result } = renderHook(() => useMarkNotificationUnread(null), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(mockMarkNotificationUnread).not.toHaveBeenCalled();
    });
  });

  describe('success path', () => {
    it('transitions to success state and invalidates SWR keys', async () => {
      mockMarkNotificationUnread.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(result.current.state).toBe('success');
      expect(mutateMock).toHaveBeenCalled();
    });

    it('forwards the notification id to the service', async () => {
      mockMarkNotificationUnread.mockResolvedValue(undefined);

      const { result } = renderHook(() => useMarkNotificationUnread('notification-99'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(mockMarkNotificationUnread).toHaveBeenCalledWith('notification-99');
    });
  });

  describe('error handling', () => {
    it('transitions to error with NOTIFICATION_NOT_FOUND', async () => {
      mockMarkNotificationUnread.mockRejectedValue(
        makeApiError(404, 'NOTIFICATION_NOT_FOUND'),
      );

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.code).toBe('NOTIFICATION_NOT_FOUND');
      expect(isApiError(result.current.error!)).toBe(true);
    });

    it('transitions to error with GLOBAL_UNAUTHENTICATED', async () => {
      mockMarkNotificationUnread.mockRejectedValue(
        makeApiError(401, 'GLOBAL_UNAUTHENTICATED'),
      );

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(result.current.error?.code).toBe('GLOBAL_UNAUTHENTICATED');
    });

    it('wraps plain Error into ApiError', async () => {
      mockMarkNotificationUnread.mockRejectedValue(new Error('Network error'));

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      expect(isApiError(result.current.error!)).toBe(true);
    });
  });

  describe('double-click guard', () => {
    it('only fires one service call when invoked twice while pending', async () => {
      let resolveMark: (value: unknown) => void;
      mockMarkNotificationUnread.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveMark = resolve;
          }),
      );

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      const firstPromise = result.current.markUnread();

      await act(async () => {
        await result.current.markUnread();
      });

      resolveMark!(undefined);
      await firstPromise;

      expect(mockMarkNotificationUnread).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('clears error and returns to idle', async () => {
      mockMarkNotificationUnread.mockRejectedValue(
        makeApiError(404, 'NOTIFICATION_NOT_FOUND'),
      );

      const { result } = renderHook(() => useMarkNotificationUnread('n1'), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.markUnread();
      });

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });
});
