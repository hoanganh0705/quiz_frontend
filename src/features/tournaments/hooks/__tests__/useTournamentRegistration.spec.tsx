

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

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

const mockRegisterForTournament = vi.fn();
const mockWithdrawFromTournament = vi.fn();
vi.mock('@/features/tournaments/services/tournaments.service', () => ({
registerForTournament: (...args: unknown[]) => mockRegisterForTournament(...args),
withdrawFromTournament: (...args: unknown[]) => mockWithdrawFromTournament(...args),
}));

import { useTournamentRegistration } from '../useTournamentRegistration';

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

describe('useTournamentRegistration', () => {
beforeEach(() => {
vi.clearAllMocks();
mutateMock.mockResolvedValue(undefined);
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
mockRegisterForTournament.mockResolvedValue({
data: { tournamentId: 'tournament-1', isRegistered: true, registeredAt: '2024-01-01T00:00:00Z' },
    });
mockWithdrawFromTournament.mockResolvedValue({
data: { tournamentId: 'tournament-1', withdrawnAt: '2024-01-01T00:00:00Z' },
    });
  });

afterEach(() => {
vi.restoreAllMocks();
mutateMock.mockReset();
  });

describe('initialization', () => {
it('returns composed state from participation hook', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.isRegistered).toBe(false);
expect(result.current.isEligible).toBe(true);
expect(result.current.isLoading).toBe(false);
    });

it('returns idle mutation states', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.registerState).toBe('idle');
expect(result.current.withdrawState).toBe('idle');
expect(result.current.registerError).toBeNull();
expect(result.current.withdrawError).toBeNull();
    });
  });

describe('participation state', () => {
it('returns isRegistered=true when user is in participant list', () => {
mockUseTournamentParticipants.mockReturnValueOnce({
items: [makeMockParticipant('user-123')],
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.isRegistered).toBe(true);
expect(result.current.canWithdraw).toBe(true);
    });

it('returns isEligible=false for full tournament', () => {
mockUseTournament.mockReturnValueOnce({
tournament: { ...mockTournament, totalParticipants: 100, maxParticipants: 100 },
isLoading: false,
error: null,
      });

const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.isEligible).toBe(false);
    });
  });

describe('register function', () => {
it('exposes register function', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(typeof result.current.register).toBe('function');
    });

it('exposes withdraw function', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(typeof result.current.withdraw).toBe('function');
    });
  });

describe('independent mutation states', () => {
it('register and withdraw states are independent', () => {

const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.registerState).toBe('idle');
expect(result.current.withdrawState).toBe('idle');

expect(result.current.participation).not.toBeNull();
    });
  });

describe('reset function', () => {
it('exposes reset function', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(typeof result.current.reset).toBe('function');
    });

it('reset is callable without error', () => {
const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(() => result.current.reset()).not.toThrow();
    });
  });

describe('feature flag handling', () => {
it('returns safe fallback when flag is placeholder', () => {
mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.participation).toBeNull();
expect(result.current.isRegistered).toBe(false);
expect(result.current.isEligible).toBe(false);
    });
  });

describe('auth handling', () => {
it('returns null participation when not authenticated', () => {
mockUseAuthBootstrap.mockReturnValueOnce({
bootstrapState: 'unauthenticated',
currentUser: null,
      });

const { result } = renderHook(() =>
useTournamentRegistration('tournament-1'),
      );

expect(result.current.participation).toBeNull();
    });
  });
});
