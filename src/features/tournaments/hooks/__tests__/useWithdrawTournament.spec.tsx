

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mutateMock = vi.fn();
vi.mock('swr', async () => {
const actual = await vi.importActual<typeof import('swr')>('swr');
return {
...actual,
mutate: (...args: unknown[]) => mutateMock(...args),
  };
});

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

const mockWithdrawFromTournament = vi.fn();
vi.mock('@/features/tournaments/services/tournaments.service', () => ({
withdrawFromTournament: (...args: unknown[]) => mockWithdrawFromTournament(...args),
}));

import { useWithdrawTournament } from '../useWithdrawTournament';
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

describe('useWithdrawTournament', () => {
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
useWithdrawTournament('tournament-1'),
      );

expect(result.current.state).toBe('idle');
expect(result.current.error).toBeNull();
    });

it('withdraw is a no-op when flag is placeholder', async () => {
mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(mockWithdrawFromTournament).not.toHaveBeenCalled();
expect(result.current.state).toBe('idle');
    });

it('withdraw is a no-op when tournamentId is null', async () => {
const { result } = renderHook(() =>
useWithdrawTournament(null),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(mockWithdrawFromTournament).not.toHaveBeenCalled();
    });
  });

describe('success path', () => {
it('transitions to success state and invalidates SWR keys', async () => {
mockWithdrawFromTournament.mockResolvedValueOnce({
data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' },
      });

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('success');
expect(result.current.error).toBeNull();

expect(mutateMock).toHaveBeenCalled();
    });

it('resets to idle after 2 seconds on success', async () => {
vi.useFakeTimers();

mockWithdrawFromTournament.mockResolvedValueOnce({
data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' },
      });

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('success');

await act(async () => {
vi.advanceTimersByTime(2000);
      });

expect(result.current.state).toBe('idle');

vi.useRealTimers();
    });

it('invalidates detail, participants, and leaderboard keys', async () => {
mockWithdrawFromTournament.mockResolvedValueOnce({
data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' },
      });

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(mutateMock).toHaveBeenCalledTimes(3);
    });
  });

describe('error handling — NOT_REGISTERED', () => {
it('transitions to error state with NOT_REGISTERED code', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(409, 'NOT_REGISTERED'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(result.current.error).not.toBeNull();
expect(result.current.error?.code).toBe('NOT_REGISTERED');
    });
  });

describe('error handling — TOURNAMENT_REGISTRATION_CLOSED', () => {
it('transitions to error state with TOURNAMENT_REGISTRATION_CLOSED code', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(409, 'TOURNAMENT_REGISTRATION_CLOSED'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(result.current.error?.code).toBe('TOURNAMENT_REGISTRATION_CLOSED');
    });
  });

describe('error handling — FORBIDDEN', () => {
it('transitions to error state with FORBIDDEN code', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(403, 'FORBIDDEN'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(result.current.error?.code).toBe('FORBIDDEN');
    });
  });

describe('error handling — UNAUTHORIZED', () => {
it('transitions to error state with UNAUTHORIZED code', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(401, 'UNAUTHORIZED'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(result.current.error?.code).toBe('UNAUTHORIZED');
    });
  });

describe('double-click prevention', () => {
it('prevents second call while pending', async () => {
let resolveWithdrawal: (value: unknown) => void;
mockWithdrawFromTournament.mockImplementationOnce(
() => new Promise((resolve) => { resolveWithdrawal = resolve; }),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
const promise = result.current.withdraw();

expect(result.current.state).toBe('pending');
resolveWithdrawal!({ data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' } });
await promise;
      });

expect(mockWithdrawFromTournament).toHaveBeenCalledTimes(1);
    });

it('allows call after pending resolves', async () => {
mockWithdrawFromTournament
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' } })
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' } });

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('success');

vi.useFakeTimers();
await act(async () => {
vi.advanceTimersByTime(2000);
      });
vi.useRealTimers();

await act(async () => {
await result.current.withdraw();
      });

expect(mockWithdrawFromTournament).toHaveBeenCalledTimes(2);
    });
  });

describe('no-blind-retry', () => {
it('does not auto-retry after error', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(409, 'NOT_REGISTERED'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');

await flushMicrotasks();
expect(mockWithdrawFromTournament).toHaveBeenCalledTimes(1);
    });

it('allows manual retry via user action', async () => {
mockWithdrawFromTournament
        .mockRejectedValueOnce(makeApiError(409, 'NOT_REGISTERED'))
        .mockResolvedValueOnce({ data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' } });

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(mockWithdrawFromTournament).toHaveBeenCalledTimes(1);

result.current.reset();

await act(async () => {
await result.current.withdraw();
      });

expect(mockWithdrawFromTournament).toHaveBeenCalledTimes(2);
    });
  });

describe('reset', () => {
it('resets state to idle and clears error', async () => {
mockWithdrawFromTournament.mockRejectedValueOnce(
makeApiError(409, 'NOT_REGISTERED'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
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
mockWithdrawFromTournament.mockRejectedValueOnce(
new Error('Network error'),
      );

const { result } = renderHook(() =>
useWithdrawTournament('tournament-1'),
      );

await act(async () => {
await result.current.withdraw();
      });

expect(result.current.state).toBe('error');
expect(result.current.error).not.toBeNull();
    });
  });
});
