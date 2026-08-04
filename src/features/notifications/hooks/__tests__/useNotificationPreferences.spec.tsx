/**
 * `useNotificationPreferences.spec.tsx` — locks the preferences read/update hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.G1.
 *
 * Tests cover:
 * - read path: GET preferences, surface via `preferences` and `isLoading`
 * - update path: optimistic merge, state transitions, error code branching
 * - feature flag placeholder: read returns empty prefs, update is a no-op
 * - double-click guard
 * - reset
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { SWRConfig } from 'swr';

import { useNotificationPreferences } from '@/features/notifications/hooks/useNotificationPreferences';
import { ApiError, isApiError } from '@/lib/api';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockGetNotificationPreferences = vi.fn();
const mockUpdateNotificationPreferences = vi.fn();
vi.mock('@/features/notifications/services/notifications.service', () => ({
  getNotificationPreferences: (...args: unknown[]) => mockGetNotificationPreferences(...args),
  updateNotificationPreferences: (...args: unknown[]) =>
    mockUpdateNotificationPreferences(...args),
}));

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

const FULL_PREFERENCES = {
  inAppEnabled: true,
  emailEnabled: true,
  pushEnabled: false,
  achievementEnabled: true,
  tournamentEnabled: true,
  rankEnabled: true,
  friendEnabled: true,
  commentEnabled: true,
  summaryEnabled: false,
  marketingEnabled: false,
  rankImprovementThreshold: 5,
};

describe('useNotificationPreferences', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetFeatureFlagValue.mockReturnValue('live');
    mockGetNotificationPreferences.mockResolvedValue(FULL_PREFERENCES);
    mockUpdateNotificationPreferences.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  describe('read path', () => {
    it('returns preferences from service', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      expect(result.current.preferences).toMatchObject({
        emailEnabled: true,
        rankImprovementThreshold: 5,
      });
      expect(mockGetNotificationPreferences).toHaveBeenCalled();
    });

    it('returns null preferences while loading', async () => {
      mockGetNotificationPreferences.mockReturnValue(new Promise(() => {}));

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.preferences).toBeNull();
        expect(result.current.isLoading).toBe(true);
      });
    });
  });

  describe('feature flag gating', () => {
    it('does not call service when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      renderHook(() => useNotificationPreferences(), { wrapper: TestSwrProvider });

      await new Promise((resolve) => setTimeout(resolve, 10));
      expect(mockGetNotificationPreferences).not.toHaveBeenCalled();
    });

    it('update is a no-op when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValue('placeholder');

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await act(async () => {
        await result.current.update({ emailEnabled: false });
      });

      expect(mockUpdateNotificationPreferences).not.toHaveBeenCalled();
    });
  });

  describe('update path', () => {
    it('forwards the patch to the service', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      await act(async () => {
        await result.current.update({ emailEnabled: false });
      });

      expect(mockUpdateNotificationPreferences).toHaveBeenCalledWith({
        emailEnabled: false,
      });
    });

    it('transitions to isUpdated after a successful update', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      await act(async () => {
        await result.current.update({ marketingEnabled: true });
      });

      expect(result.current.isUpdated).toBe(true);
      expect(result.current.isUpdating).toBe(false);
      expect(result.current.updateError).toBeNull();
    });
  });

  describe('error handling', () => {
    it('transitions to error with GLOBAL_VALIDATION_FAILED', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      mockUpdateNotificationPreferences.mockRejectedValue(
        makeApiError(400, 'GLOBAL_VALIDATION_FAILED'),
      );

      await act(async () => {
        await result.current.update({ rankImprovementThreshold: -1 });
      });

      expect(isApiError(result.current.updateError!)).toBe(true);
      expect(result.current.updateError?.code).toBe('GLOBAL_VALIDATION_FAILED');
    });

    it('transitions to error with INVALID_PREFERENCE_VALUE', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      mockUpdateNotificationPreferences.mockRejectedValue(
        makeApiError(422, 'INVALID_PREFERENCE_VALUE'),
      );

      await act(async () => {
        await result.current.update({ rankImprovementThreshold: -1 });
      });

      expect(result.current.updateError?.code).toBe('INVALID_PREFERENCE_VALUE');
    });

    it('transitions to error with GLOBAL_UNAUTHENTICATED', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      mockUpdateNotificationPreferences.mockRejectedValue(
        makeApiError(401, 'GLOBAL_UNAUTHENTICATED'),
      );

      await act(async () => {
        await result.current.update({ emailEnabled: false });
      });

      expect(result.current.updateError?.code).toBe('GLOBAL_UNAUTHENTICATED');
    });
  });

  describe('double-click guard', () => {
    it('only fires one service call when invoked twice while pending', async () => {
      let resolveUpdate: (value: unknown) => void;
      mockUpdateNotificationPreferences.mockImplementationOnce(
        () =>
          new Promise<unknown>((resolve) => {
            resolveUpdate = resolve;
          }),
      );

      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });

      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      const firstPromise = result.current.update({ emailEnabled: false });

      await act(async () => {
        await result.current.update({ emailEnabled: true });
      });

      resolveUpdate!(undefined);
      await firstPromise;

      expect(mockUpdateNotificationPreferences).toHaveBeenCalledTimes(1);
    });
  });

  describe('reset', () => {
    it('clears the updateError', async () => {
      const { result } = renderHook(() => useNotificationPreferences(), {
        wrapper: TestSwrProvider,
      });
      await waitFor(() => {
        expect(result.current.preferences).not.toBeNull();
      });

      mockUpdateNotificationPreferences.mockRejectedValue(
        makeApiError(500, 'GLOBAL_INTERNAL_ERROR'),
      );

      await act(async () => {
        await result.current.update({ emailEnabled: false });
      });

      expect(result.current.updateError).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.updateError).toBeNull();
      expect(result.current.isUpdated).toBe(false);
    });
  });
});
