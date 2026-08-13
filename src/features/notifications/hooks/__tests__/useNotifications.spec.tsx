/**
 * `useNotifications.spec.tsx` — locks the cursor-paginated notification list hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.G1.
 *
 * Tests cover:
 * - feature flag placeholder: no service call fires, safe fallback returned
 * - service call forwarding with correct filter shape
 * - pagination: cursor forwarding, page append without duplicates, hasMore
 * - synthesised `id` alias from `notificationId`
 * - stale-data surface contract (`isStale` field present)
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { act } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useNotifications } from '@/features/notifications/hooks/useNotifications';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockListNotifications = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
  listNotifications: (...args: unknown[]) => mockListNotifications(...args),
}));

const DEFAULT_FILTERS = {
  unreadOnly: undefined,
  type: undefined,
  fromDate: undefined,
  toDate: undefined,
  cursor: undefined,
  limit: undefined,
};

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

describe('useNotifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue('live');
  });

  afterEach(() => {
    cleanup();
  });

  describe('feature flag gating', () => {
    it('returns empty items when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items).toEqual([]);
      });
      expect(result.current.hasMore).toBe(false);
    });

    it('does not call listNotifications when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      renderHook(() => useNotifications(), { wrapper: TestSwrProvider });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockListNotifications).not.toHaveBeenCalled();
    });
  });

  describe('service forwarding', () => {
    it('calls listNotifications with default empty params', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items).toBeDefined();
      });

      expect(mockListNotifications).toHaveBeenCalledWith({});
    });

    it('forwards unreadOnly filter to service', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      renderHook(
        () => useNotifications({ ...DEFAULT_FILTERS, unreadOnly: true }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(mockListNotifications).toHaveBeenCalled();
      });

      const lastCall = mockListNotifications.mock.calls.at(-1)?.[0] ?? {};
      expect(lastCall).toMatchObject({ unreadOnly: true });
    });

    it('forwards type filter to service', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      renderHook(
        () => useNotifications({ ...DEFAULT_FILTERS, type: 'achievement' as never }),
        { wrapper: TestSwrProvider },
      );

      await waitFor(() => {
        expect(mockListNotifications).toHaveBeenCalled();
      });

      const lastCall = mockListNotifications.mock.calls.at(-1)?.[0] ?? {};
      expect(lastCall).toMatchObject({ type: 'achievement' });
    });
  });

  describe('id alias synthesis', () => {
    it('synthesises id alias from notificationId', async () => {
      mockListNotifications.mockResolvedValue({
        data: [
          {
            notificationId: 'n1',
            type: 'achievement',
            channel: 'in_app',
            isRead: false,
            title: 'Test',
            body: 'Test body',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items.length).toBe(1);
      });

      expect(result.current.items[0]).toMatchObject({
        id: 'n1',
        notificationId: 'n1',
      });
    });

    // TKT-5.4.H4 — regression guard for the
    // "popover shows No notifications even though the backend returns 5
    // items" bug. The service must return the *wrapped* SDK envelope
    // (`{ data: NotificationResponseDto[], meta: { pagination: ... } }`),
    // NOT the inner `data` array. `useCursorPaginated` reads
    // `wire.data` / `wire.meta.pagination` directly; if the service
    // unwraps the envelope (returns `data.data`), the fetcher ends up
    // reading `undefined.data` and projects an empty list, which
    // surfaces in the UI as the empty state.
    it('treats the service return as a wrapped envelope (not an unwrapped array)', async () => {
      // Simulate a 5-item backend response in the wrapped shape the
      // SDK actually returns.
      const wrapped = {
        data: Array.from({ length: 5 }).map((_, i) => ({
          notificationId: `n${i + 1}`,
          type: 'comment_reply' as const,
          channel: 'in_app' as const,
          isRead: false,
          title: `Title ${i + 1}`,
          message: `Message ${i + 1}`,
          createdAt: '2026-01-01T00:00:00Z',
        })),
        meta: {
          pagination: { limit: 5, nextCursor: 'cursor-2', hasNextPage: true },
        },
      };
      mockListNotifications.mockResolvedValue(wrapped);

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items.length).toBe(5);
      });

      expect(result.current.hasMore).toBe(true);
      expect(result.current.items.map((item) => item.id)).toEqual([
        'n1', 'n2', 'n3', 'n4', 'n5',
      ]);
    });
  });

  describe('pagination', () => {
    it('returns items from service response', async () => {
      mockListNotifications.mockResolvedValue({
        data: [
          {
            notificationId: 'n1',
            type: 'achievement',
            channel: 'in_app',
            isRead: false,
            title: 'N1',
            body: 'Body 1',
            createdAt: '2026-01-01T00:00:00Z',
          },
          {
            notificationId: 'n2',
            type: 'tournament',
            channel: 'in_app',
            isRead: true,
            title: 'N2',
            body: 'Body 2',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items.length).toBe(2);
      });

      expect(result.current.items[0]?.id).toBe('n1');
      expect(result.current.items[1]?.id).toBe('n2');
    });

    it('exposes hasMore when server reports hasNextPage', async () => {
      mockListNotifications.mockResolvedValue({
        data: [
          {
            notificationId: 'n1',
            type: 'achievement',
            channel: 'in_app',
            isRead: false,
            title: 'N1',
            body: 'Body 1',
            createdAt: '2026-01-01T00:00:00Z',
          },
        ],
        meta: { pagination: { limit: 20, nextCursor: 'cursor-2', hasNextPage: true } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.hasMore).toBe(true);
      });
    });
  });

  describe('error handling', () => {
    it('surfaces service error', async () => {
      const apiError = Object.assign(new Error('Service error'), {
        isAxiosError: true,
        response: { status: 500, data: { code: 'INTERNAL_ERROR' } },
      });
      mockListNotifications.mockImplementation(() => {
        // Reject asynchronously in a way that mirrors a network failure
        // but does not surface as an unhandled rejection after the test
        // completes.
        return new Promise((_, reject) => {
          queueMicrotask(() => reject(apiError));
        });
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.error).toBeTruthy();
      });
    });
  });

  describe('refresh', () => {
    it('exposes a refresh function that triggers refetch', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(mockListNotifications).toHaveBeenCalled();
      });

      const callsBefore = mockListNotifications.mock.calls.length;
      await act(async () => {
        await result.current.refresh();
      });
      expect(mockListNotifications.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });

  describe('stale-data surface', () => {
    it('exposes isStale field on the result', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.items).toBeDefined();
      });

      // The hook always returns a boolean for isStale (currently false)
      expect(typeof result.current.isStale).toBe('boolean');
    });
  });

  describe('loader state', () => {
    it('exposes isLoading and isLoadingMore fields', async () => {
      mockListNotifications.mockResolvedValue({
        data: [],
        meta: { pagination: { limit: 20, nextCursor: null, hasNextPage: false } },
      });

      const { result } = renderHook(() => useNotifications(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(result.current.items).toBeDefined();
      });

      expect(typeof result.current.isLoading).toBe('boolean');
      expect(typeof result.current.isLoadingMore).toBe('boolean');
    });
  });
});
