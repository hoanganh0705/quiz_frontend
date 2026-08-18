

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

vi.mock('@/features/users/store/user-store', () => ({
useUser: vi.fn(),
}))

import { useUser } from '@/features/users/store/user-store'
import { useDailyChallengeStreakView } from '@/features/daily-challenge/hooks/useDailyChallengeStreakView'

const useUserMock = vi.mocked(useUser)

beforeEach(() => {
useUserMock.mockReset()
})

describe('useDailyChallengeStreakView — unauthenticated', () => {
it('(1) returns { streak: null, isAuthenticated: false } when the user store is null', () => {
useUserMock.mockReturnValue(null)

const { result } = renderHook(() => useDailyChallengeStreakView())

expect(result.current.streak).toBeNull()
expect(result.current.isAuthenticated).toBe(false)
  })
})

describe('useDailyChallengeStreakView — authenticated', () => {
it('(2) returns { streak: 5, isAuthenticated: true } when currentStreak is 5', () => {
useUserMock.mockReturnValue({
userId: 'u-1',
username: 'player',
email: 'player@example.com',
displayName: null,
avatarUrl: null,
bio: null,
xpTotal: 100,
currentStreak: 5,
longestStreak: 10,
settings: {},
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as NonNullable<Parameters<typeof useUserMock.mockReturnValue>[0]>)

const { result } = renderHook(() => useDailyChallengeStreakView())

expect(result.current.streak).toBe(5)
expect(result.current.isAuthenticated).toBe(true)
  })

it('(3) returns { streak: 0, isAuthenticated: true } when the user has not started a streak', () => {
useUserMock.mockReturnValue({
userId: 'u-2',
username: 'player',
email: 'player@example.com',
displayName: null,
avatarUrl: null,
bio: null,
xpTotal: 0,
currentStreak: 0,
longestStreak: 0,
settings: {},
createdAt: '2026-01-01T00:00:00.000Z',
updatedAt: '2026-01-01T00:00:00.000Z',
    } as unknown as NonNullable<Parameters<typeof useUserMock.mockReturnValue>[0]>)

const { result } = renderHook(() => useDailyChallengeStreakView())

expect(result.current.streak).toBe(0)
expect(result.current.isAuthenticated).toBe(true)
  })
})
