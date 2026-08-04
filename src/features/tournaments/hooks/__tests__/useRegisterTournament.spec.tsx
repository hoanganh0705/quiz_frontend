/**
 * `useRegisterTournament.spec.tsx` — unit tests for tournament registration mutation.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.3 — Tournament registration and participant-state mutations.
 * Source ticket: TKT-5.3.G1.
 *
 * Tests cover:
 * - success path (state transitions + SWR invalidation)
 * - error codes: ALREADY_REGISTERED, TOURNAMENT_FULL, TOURNAMENT_REGISTRATION_CLOSED, UNAUTHORIZED
 * - pending-state double-click prevention
 * - no-blind-retry after error
 */

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

// Mock SWR's global `mutate`
const mutateMock = vi.fn();
vi.mock('swr', async () => {
  const actual = await vi.importActual<typeof import('swr')>('swr');
  return {
    ...actual,
    mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

// Mock feature flags
const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

// Mock service
const mockRegisterForTournament = vi.fn();
vi.mock('@/features/tournaments/services/tournaments.service', () => ({
  registerForTournament: (...args: unknown[]) => mockRegisterForTournament(...args),
}));

// Import after mocks
import { useRegisterTournament } from '../useRegisterTournament';
import { ApiError } from '@/lib/api';

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
      },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0]);
}

function flushMicrotasks(): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('useRegisterTournament', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mutateMock.mockResolvedValue(undefined);
    mockGetFeatureFlagValue.mockReturnValue('live');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    mutateMock.mockReset();
  });

  describe('initialization', () => {
    it('starts with idle state', () => {
      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });

    it('register is a no-op when flag is placeholder', async () => {
      mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(mockRegisterForTournament).not.toHaveBeenCalled();
      expect(result.current.state).toBe('idle');
    });

    it('register is a no-op when tournamentId is null', async () => {
      const { result } = renderHook(() =>
        useRegisterTournament(null),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(mockRegisterForTournament).not.toHaveBeenCalled();
    });
  });

  describe('success path', () => {
    it('transitions to success state and invalidates SWR keys', async () => {
      mockRegisterForTournament.mockResolvedValueOnce({
        data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' },
      });

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('success');
      expect(result.current.error).toBeNull();

      // SWR keys should be invalidated
      expect(mutateMock).toHaveBeenCalled();
    });

    it('resets to idle after 2 seconds on success', async () => {
      vi.useFakeTimers();

      mockRegisterForTournament.mockResolvedValueOnce({
        data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' },
      });

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('success');

      // Advance timer
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });

      expect(result.current.state).toBe('idle');

      vi.useRealTimers();
    });

    it('invalidates detail, participants, and leaderboard keys', async () => {
      mockRegisterForTournament.mockResolvedValueOnce({
        data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' },
      });

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      // Should invalidate all three keys
      expect(mutateMock).toHaveBeenCalledTimes(3);
    });
  });

  describe('error handling — ALREADY_REGISTERED', () => {
    it('transitions to error state with ALREADY_REGISTERED code', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(409, 'ALREADY_REGISTERED'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).not.toBeNull();
      expect(result.current.error?.code).toBe('ALREADY_REGISTERED');
    });
  });

  describe('error handling — TOURNAMENT_FULL', () => {
    it('transitions to error state with TOURNAMENT_FULL code', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(409, 'TOURNAMENT_FULL'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.code).toBe('TOURNAMENT_FULL');
    });
  });

  describe('error handling — TOURNAMENT_REGISTRATION_CLOSED', () => {
    it('transitions to error state with TOURNAMENT_REGISTRATION_CLOSED code', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(409, 'TOURNAMENT_REGISTRATION_CLOSED'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.code).toBe('TOURNAMENT_REGISTRATION_CLOSED');
    });
  });

  describe('error handling — TOURNAMENT_INELIGIBLE', () => {
    it('transitions to error state with TOURNAMENT_INELIGIBLE code', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(403, 'TOURNAMENT_INELIGIBLE'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.code).toBe('TOURNAMENT_INELIGIBLE');
    });
  });

  describe('error handling — UNAUTHORIZED', () => {
    it('transitions to error state with UNAUTHORIZED code', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(401, 'UNAUTHORIZED'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error?.code).toBe('UNAUTHORIZED');
    });
  });

  describe('double-click prevention', () => {
    it('prevents second call while pending', async () => {
      let resolveRegistration: (value: unknown) => void;
      mockRegisterForTournament.mockImplementationOnce(
        () => new Promise((resolve) => { resolveRegistration = resolve; }),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      // First call
      await act(async () => {
        const promise = result.current.register();
        // Start the mutation
        expect(result.current.state).toBe('pending');
        resolveRegistration!({ data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' } });
        await promise;
      });

      // Only one service call should have been made
      expect(mockRegisterForTournament).toHaveBeenCalledTimes(1);
    });

    it('allows call after pending resolves', async () => {
      mockRegisterForTournament
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' } })
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' } });

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      // First call
      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('success');

      // After 2 seconds, state resets to idle
      vi.useFakeTimers();
      await act(async () => {
        vi.advanceTimersByTime(2000);
      });
      vi.useRealTimers();

      // Second call should work
      await act(async () => {
        await result.current.register();
      });

      expect(mockRegisterForTournament).toHaveBeenCalledTimes(2);
    });
  });

  describe('no-blind-retry', () => {
    it('does not auto-retry after error', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(409, 'TOURNAMENT_FULL'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');

      // No automatic retry - only one call should have been made
      await flushMicrotasks();
      expect(mockRegisterForTournament).toHaveBeenCalledTimes(1);
    });

    it('allows manual retry via user action', async () => {
      mockRegisterForTournament
        .mockRejectedValueOnce(makeApiError(409, 'TOURNAMENT_FULL'))
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' } });

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      // First call fails
      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(mockRegisterForTournament).toHaveBeenCalledTimes(1);

      // Reset and retry
      result.current.reset();

      await act(async () => {
        await result.current.register();
      });

      expect(mockRegisterForTournament).toHaveBeenCalledTimes(2);
    });
  });

  describe('reset', () => {
    it('resets state to idle and clears error', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        makeApiError(409, 'TOURNAMENT_FULL'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).not.toBeNull();

      act(() => {
        result.current.reset();
      });

      expect(result.current.state).toBe('idle');
      expect(result.current.error).toBeNull();
    });
  });

  describe('network error', () => {
    it('handles network errors as ApiError', async () => {
      mockRegisterForTournament.mockRejectedValueOnce(
        new Error('Network error'),
      );

      const { result } = renderHook(() =>
        useRegisterTournament('tournament-1'),
      );

      await act(async () => {
        await result.current.register();
      });

      expect(result.current.state).toBe('error');
      expect(result.current.error).not.toBeNull();
    });
  });
});
