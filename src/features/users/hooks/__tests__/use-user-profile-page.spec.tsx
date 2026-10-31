
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockUseUserProfileQuery = vi.fn()
const mockUseAuthSession = vi.fn()

vi.mock('@/features/users/graphql/user-profile.graphql', () => ({
  USER_PROFILE_DEFAULT_ACTIVITY_FIRST: 30,
  USER_PROFILE_DEFAULT_FOLLOWERS_FIRST: 50,
  USER_PROFILE_DEFAULT_FOLLOWING_FIRST: 50,
  useUserProfileQuery: (...args: unknown[]) => mockUseUserProfileQuery(...args),
}))

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}))

import { usePublicProfilePage } from '@/features/users/hooks/use-user-profile-page'

function setAuth({
  isAuthenticated,
  currentUserId,
  username,
}: {
  isAuthenticated: boolean
  currentUserId: string | null
  username: string | null
}) {
  mockUseAuthSession.mockReturnValue({
    isAuthenticated,
    isBootstrapping: false,
    isDegraded: false,
    bootstrapState: isAuthenticated ? 'authenticated' : 'unauthenticated',
    currentUserId,
    user: currentUserId
      ? { userId: currentUserId, username, displayName: username }
      : null,
    currentUser: currentUserId
      ? { userId: currentUserId, username, displayName: username }
      : null,
  })
}

const FULL_PROFILE = {
  summary: {
    userId: '00000000-0000-7000-8000-000000000001',
    username: 'alice',
    displayName: 'Alice',
    avatarUrl: null,
    bio: null,
    country: null,
    level: 3,
    currentStreak: 4,
    followers: 11,
    following: 7,
    quizzesTaken: 9,
    quizzesCreated: 1,
  },
  analytics: { summary: { averageScore: 71 } },
  recentActivity: [
    {
      eventId: 'evt-1',
      eventType: 'quiz_completed',
      createdAt: '2026-08-01T10:00:00.000Z',
    },
  ],
}

beforeEach(() => {
  mockUseUserProfileQuery.mockReset()
  mockUseAuthSession.mockReset()
  setAuth({ isAuthenticated: false, currentUserId: null, username: null })
  mockUseUserProfileQuery.mockReturnValue({
    data: { userProfile: FULL_PROFILE },
    loading: false,
    error: null,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('usePublicProfilePage — query wiring', () => {
  it('passes includeAnalytics=false / includeFollowers=false when the viewer is anonymous', () => {
    setAuth({ isAuthenticated: false, currentUserId: null, username: null })

    renderHook(() => usePublicProfilePage({ name: 'alice' }))

    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: {
        username: string
        includeAnalytics: boolean
        includeFollowers: boolean
        followersFirst: number
        followingFirst: number
        activityFirst: number
      }
    }
    expect(arg.variables.username).toBe('alice')
    expect(arg.variables.includeAnalytics).toBe(false)
    expect(arg.variables.includeFollowers).toBe(false)
  })

  it('passes includeAnalytics=true / includeFollowers=true when the viewer is authenticated and matches the profile name', () => {
    setAuth({
      isAuthenticated: true,
      currentUserId: '00000000-0000-7000-8000-000000000001',
      username: 'alice',
    })

    renderHook(() => usePublicProfilePage({ name: 'alice' }))

    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: {
        includeAnalytics: boolean
        includeFollowers: boolean
      }
    }
    expect(arg.variables.includeAnalytics).toBe(true)
    expect(arg.variables.includeFollowers).toBe(true)
  })

  it('always passes the page-size variables for the social rails', () => {
    renderHook(() => usePublicProfilePage({ name: 'alice' }))

    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: {
        followersFirst: number
        followingFirst: number
        activityFirst: number
      }
    }
    expect(arg.variables.followersFirst).toBe(50)
    expect(arg.variables.followingFirst).toBe(50)
    expect(arg.variables.activityFirst).toBe(30)
  })
})

describe('usePublicProfilePage — projection', () => {
  it('exposes the quizzesTaken / quizzesCreated counts from the summary block', () => {
    setAuth({ isAuthenticated: false, currentUserId: null, username: null })

    const { result } = renderHook(() => usePublicProfilePage({ name: 'alice' }))

    expect(result.current.quizzesTaken).toBe(9)
    expect(result.current.quizzesCreated).toBe(1)
  })

  it('exposes the recent activities from the bundle when populated', () => {
    setAuth({ isAuthenticated: false, currentUserId: null, username: null })

    const { result } = renderHook(() => usePublicProfilePage({ name: 'alice' }))

    expect(result.current.recentActivities).toHaveLength(1)
  })

  it('flags isSelf only when the viewer is authenticated and matches the profile slug', async () => {
    setAuth({ isAuthenticated: true, currentUserId: 'self-id', username: 'bob' })

    const { result, rerender } = renderHook(
      ({ name }) => usePublicProfilePage({ name }),
      { initialProps: { name: 'bob' } },
    )

    await waitFor(() => expect(result.current.isSelf).toBe(true))
    expect(result.current.resolvedUserId).toBe('self-id')

    rerender({ name: 'carol' })

    await waitFor(() => expect(result.current.isSelf).toBe(false))
    expect(result.current.resolvedUserId).toBeNull()
  })
})
