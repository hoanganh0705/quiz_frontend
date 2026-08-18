

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

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

const mockUseAuthBootstrap = vi.fn();
vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: (...args: unknown[]) => mockUseAuthBootstrap(...args),
}));

const mockUseTournament = vi.fn();
vi.mock('@/features/tournaments/hooks/useTournament', () => ({
useTournament: (...args: unknown[]) => mockUseTournament(...args),
}));

const mockUseTournamentParticipants = vi.fn();
vi.mock('@/features/tournaments/hooks/useTournamentParticipants', () => ({
useTournamentParticipants: (...args: unknown[]) => mockUseTournamentParticipants(...args),
}));

import { useTournamentParticipation } from '../useTournamentParticipation';

const mockUser = { userId: 'user-123', id: 'user-123' };

const mockTournament = {
id: 'tournament-1',
title: 'Test Tournament',
status: 'upcoming' as const,
totalParticipants: 10,
maxParticipants: 100,
};

function makeMockParticipant(userId: string) {
return {
userId,
username: `User ${userId}`,
rank: 1,
score: 100,
registeredAt: '2024-01-01T00:00:00Z',
  };
}

function flushMicrotasks(): Promise<void> {
return new Promise<void>((resolve) => setTimeout(resolve, 0));
}

describe('useTournamentParticipation', () => {
beforeEach(() => {
vi.clearAllMocks();
mockGetFeatureFlagValue.mockReturnValue('live');
mockUseAuthBootstrap.mockReturnValue({
bootstrapState: 'authenticated',
currentUser: mockUser,
    });
mockUseTournament.mockReturnValue({
tournament: mockTournament,
isLoading: false,
error: null,
    });
mockUseTournamentParticipants.mockReturnValue({
items: [],
isLoading: false,
error: null,
    });
  });

afterEach(() => {
vi.restoreAllMocks();
mutateMock.mockReset();
  });

describe('feature flag handling', () => {
it('returns safe fallback when flag is placeholder', async () => {
mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

expect(result.current.participation).toBeNull();
expect(result.current.isRegistered).toBe(false);
expect(result.current.isEligible).toBe(false);
expect(result.current.canWithdraw).toBe(false);
expect(result.current.isLoading).toBe(false);
    });

it('returns safe fallback when tournamentId is null', async () => {
const { result } = renderHook(() =>
useTournamentParticipation(null),
      );

expect(result.current.participation).toBeNull();
expect(result.current.isRegistered).toBe(false);
expect(result.current.isLoading).toBe(false);
    });
  });

describe('unauthenticated state', () => {
it('returns null participation when not authenticated', async () => {
mockUseAuthBootstrap.mockReturnValueOnce({
bootstrapState: 'unauthenticated',
currentUser: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

expect(result.current.participation).toBeNull();
expect(result.current.isRegistered).toBe(false);
expect(result.current.isEligible).toBe(false);
    });

it('returns null participation when bootstrap is loading', async () => {
mockUseAuthBootstrap.mockReturnValueOnce({
bootstrapState: 'loading',
currentUser: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

expect(result.current.participation).toBeNull();
expect(result.current.isLoading).toBe(true);
    });
  });

describe('registered state', () => {
it('returns isRegistered=true when user is in participant list', async () => {
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('user-123')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.isRegistered).toBe(true);
      });

expect(result.current.participation?.registrationStatus).toBe('registered');
expect(result.current.canWithdraw).toBe(true);
    });

it('includes registeredAt when user is in participant list', async () => {
const participant = makeMockParticipant('user-123');
mockUseTournamentParticipants.mockReturnValueOnce({
items: [participant],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.participation?.registeredAt).toBeTruthy();
      });
    });
  });

describe('eligible-not-registered state', () => {
it('returns isRegistered=false when user is not in participant list', async () => {
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('other-user')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.isRegistered).toBe(false);
      });

expect(result.current.participation?.registrationStatus).toBe('eligible');
    });

it('returns isEligible=true for non-full tournament', async () => {
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('other-user')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.isEligible).toBe(true);
      });
    });
  });

describe('full tournament state', () => {
it('returns status=full when totalParticipants >= maxParticipants', async () => {
mockUseTournament.mockReturnValueOnce({
tournament: { ...mockTournament, totalParticipants: 100, maxParticipants: 100 },
isLoading: false,
error: null,
      });
mockUseTournamentParticipants.mockReturnValueOnce({
items: [],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.participation?.registrationStatus).toBe('full');
      });

expect(result.current.isEligible).toBe(false);
    });
  });

describe('loading states', () => {
it('returns isLoading=true while tournament is loading', async () => {
mockUseTournament.mockReturnValueOnce({
tournament: null,
isLoading: true,
error: null,
      });
mockUseTournamentParticipants.mockReturnValueOnce({
items: [],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

expect(result.current.isLoading).toBe(true);
expect(result.current.participation).toBeNull();
    });

it('returns isLoading=true while participants are loading', async () => {
mockUseTournament.mockReturnValueOnce({
tournament: mockTournament,
isLoading: false,
error: null,
      });
mockUseTournamentParticipants.mockReturnValueOnce({
items: [],
isLoading: true,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

expect(result.current.isLoading).toBe(true);
    });
  });

describe('different user IDs', () => {
it('handles userId from currentUser.userId', async () => {
const user = { userId: 'id-from-userId-field', id: undefined };
mockUseAuthBootstrap.mockReturnValueOnce({
bootstrapState: 'authenticated',
currentUser: user,
      });
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('id-from-userId-field')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.isRegistered).toBe(true);
      });
    });

it('handles userId from currentUser.id as fallback', async () => {
const user = { userId: undefined, id: 'id-from-id-field' };
mockUseAuthBootstrap.mockReturnValueOnce({
bootstrapState: 'authenticated',
currentUser: user,
      });
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('id-from-id-field')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentParticipation('tournament-1'),
      );

await waitFor(() => {
expect(result.current.isRegistered).toBe(true);
      });
    });
  });
});
