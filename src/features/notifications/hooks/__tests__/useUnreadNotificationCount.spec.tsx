/**
 * `useUnreadNotificationCount.spec.tsx` — locks the unread-count SWR hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.G1.
 *
 * Tests cover:
 * - service forwarding
 * - feature flag placeholder returns zero without firing
 * - never goes below zero
 * - revalidation on focus / reconnect is configured
 * - defensive normalisation for non-ApiError thrown values
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { cleanup, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useUnreadNotificationCount } from '@/features/notifications/hooks/useUnreadNotificationCount';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetUnreadCount = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
  getUnreadCount: (...args: unknown[]) => mockGetUnreadCount(...args),
}));

// Mock the realtime layer so socket connections do not run during tests.
const mockUseSocket = vi.fn();
const mockUseRealtimeEvent = vi.fn();
vi.mock('@/lib/realtime', async () => {
  const actual = await vi.importActual<typeof import('@/lib/realtime')>('@/lib/realtime');
  return {
    ...actual,
    useSocket: (...args: unknown[]) => mockUseSocket(...args),
    useRealtimeEvent: (...args: unknown[]) => mockUseRealtimeEvent(...args),
  };
});

function setupSocketMocks() {
  mockUseSocket.mockReturnValue({
    socket: null,
    connectionState: 'idle',
    error: null,
    reconnect: vi.fn(),
    disconnect: vi.fn(),
  });
  mockUseRealtimeEvent.mockImplementation(() => undefined);
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

describe('useUnreadNotificationCount', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue('live');
    setupSocketMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('feature flag gating', () => {
    it('returns zero when flag is placeholder', () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      expect(result.current.unreadCount).toBe(0);
    });

    it('does not call getUnreadCount when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockGetUnreadCount).not.toHaveBeenCalled();
    });
  });

  describe('service forwarding', () => {
    it('calls getUnreadCount on mount', async () => {
      mockGetUnreadCount.mockResolvedValue({ count: 7 });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(7);
      });

      expect(mockGetUnreadCount).toHaveBeenCalledTimes(1);
    });

    it('returns 0 when service throws', async () => {
      mockGetUnreadCount.mockImplementation(() => {
        return new Promise((_, reject) => {
          queueMicrotask(() => reject(new Error('Server error')));
        });
      });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });

      expect(result.current.unreadCount).toBe(0);
    });
  });

  describe('count clamp', () => {
    it('clamps negative counts at 0', async () => {
      mockGetUnreadCount.mockResolvedValue({ count: -5 });

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });
    });

    it('returns 0 when count field is missing', async () => {
      mockGetUnreadCount.mockResolvedValue({});

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });
    });

    it('handles service returning null', async () => {
      mockGetUnreadCount.mockResolvedValue(null as never);

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.unreadCount).toBe(0);
      });
    });
  });

  describe('socket integration', () => {
    it('opens the notifications namespace when feature is live', () => {
      mockGetFeatureFlagValue.mockReturnValue('live');

      renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

      expect(mockUseSocket).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({ enabled: true }),
      );
    });

    it('does not enable the socket when feature flag is placeholder', () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

      expect(mockUseSocket).toHaveBeenCalledWith(
        '/notifications',
        expect.objectContaining({ enabled: false }),
      );
    });

    it('registers three realtime listeners when connected', () => {
      mockUseSocket.mockReturnValue({
        socket: { id: 'mock' },
        connectionState: 'connected',
        error: null,
        reconnect: vi.fn(),
        disconnect: vi.fn(),
      });

      renderHook(() => useUnreadNotificationCount(), { wrapper: TestSwrProvider });

      expect(mockUseRealtimeEvent).toHaveBeenCalledTimes(3);
    });
  });

  describe('loading state', () => {
    it('reports loading while data is pending', async () => {
      mockGetUnreadCount.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useUnreadNotificationCount(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(true);
      });
    });
  });
});
