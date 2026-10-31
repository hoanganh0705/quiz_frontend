
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

const mockUseUserProfileQuery = vi.fn()
const mockUseAuthSession = vi.fn()
const mockUseFollow = vi.fn()

vi.mock('@/features/users/graphql/user-profile.graphql', () => ({
  USER_PROFILE_DEFAULT_ACTIVITY_FIRST: 30,
  USER_PROFILE_DEFAULT_FOLLOWERS_FIRST: 50,
  USER_PROFILE_DEFAULT_FOLLOWING_FIRST: 50,
  useUserProfileQuery: (...args: unknown[]) => mockUseUserProfileQuery(...args),
}))

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
  useAuthSession: () => mockUseAuthSession(),
}))

vi.mock('@/features/social/hooks/useFollow', () => ({
  useFollow: (...args: unknown[]) => mockUseFollow(...args),
}))

import PublicProfilePage from '@/features/users/components/profile/PublicProfilePage'

interface ProfileMockPayload {
  summary: {
    userId: string
    username: string
    displayName: string | null
    avatarUrl: string | null
    bio: string | null
    country: string | null
    level: number
    currentStreak: number
    followers: number
    following: number
    quizzesTaken: number
    quizzesCreated: number
  } | null
  analytics: { summary: { averageScore: number } } | null
  recentActivity: ReadonlyArray<{
    eventId: string
    eventType: string
    createdAt: string
  }>
}

function setQuery(payload: {
  data?: ProfileMockPayload | null
  loading?: boolean
  error?: Error | null
}) {
  mockUseUserProfileQuery.mockReturnValue({
    data: payload.data === undefined ? null : { userProfile: payload.data },
    loading: payload.loading ?? false,
    error: payload.error ?? null,
    refetch: vi.fn().mockResolvedValue(undefined),
  })
}

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

function setFollowStub() {
  mockUseFollow.mockReturnValue({
    follow: vi.fn(),
    isPending: false,
    error: null,
  })
}

const FULL_PAYLOAD: ProfileMockPayload = {
  summary: {
    userId: '0192f4d8-1001-7000-8000-000000000001',
    username: 'alice',
    displayName: 'Alice Example',
    avatarUrl: null,
    bio: 'Hello world',
    country: 'Wonderland',
    level: 5,
    currentStreak: 7,
    followers: 12,
    following: 34,
    quizzesTaken: 21,
    quizzesCreated: 3,
  },
  analytics: { summary: { averageScore: 84.5 } },
  recentActivity: [
    {
      eventId: 'evt-1',
      eventType: 'quiz_completed',
      createdAt: '2026-08-10T12:00:00.000Z',
    },
    {
      eventId: 'evt-2',
      eventType: 'badge_earned',
      createdAt: '2026-08-09T10:00:00.000Z',
    },
  ],
}

beforeEach(() => {
  mockUseUserProfileQuery.mockReset()
  mockUseAuthSession.mockReset()
  mockUseFollow.mockReset()
  setFollowStub()
  setAuth({ isAuthenticated: false, currentUserId: null, username: null })
  setQuery({ data: FULL_PAYLOAD, loading: false, error: null })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('PublicProfilePage — anonymous viewer', () => {
  it('renders the summary from the bundle', () => {
    render(<PublicProfilePage routeName="alice" />)

    expect(screen.getByTestId('public-profile-page')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Alice Example',
    )
    expect(screen.getByText('21')).toBeInTheDocument()
    expect(screen.getByText('Quizzes Taken')).toBeInTheDocument()
  })

  it('passes includeAnalytics:false / includeFollowers:false to the query', () => {
    setAuth({ isAuthenticated: false, currentUserId: null, username: null })
    setQuery({ data: FULL_PAYLOAD, loading: false, error: null })

    render(<PublicProfilePage routeName="alice" />)

    expect(mockUseUserProfileQuery).toHaveBeenCalled()
    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: {
        username: string
        includeAnalytics: boolean
        includeFollowers: boolean
      }
    }
    expect(arg.variables.username).toBe('alice')
    expect(arg.variables.includeAnalytics).toBe(false)
    expect(arg.variables.includeFollowers).toBe(false)
  })

  it('shows the "sign in to view" hint on the activity tab when the viewer is anonymous', () => {
    render(<PublicProfilePage routeName="alice" />)

    const trigger = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(trigger)

    expect(
      screen.getByText(/Sign in as/i, { exact: false }),
    ).toBeInTheDocument()
  })
})

describe('PublicProfilePage — authenticated self viewer', () => {
  beforeEach(() => {
    setAuth({
      isAuthenticated: true,
      currentUserId: '0192f4d8-1001-7000-8000-000000000001',
      username: 'alice',
    })
  })

  it('passes includeAnalytics:true / includeFollowers:true to the query', () => {
    render(<PublicProfilePage routeName="alice" />)

    expect(mockUseUserProfileQuery).toHaveBeenCalled()
    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: {
        includeAnalytics: boolean
        includeFollowers: boolean
      }
    }
    expect(arg.variables.includeAnalytics).toBe(true)
    expect(arg.variables.includeFollowers).toBe(true)
  })

  it('renders the recent activity items from the bundle when the viewer is the profile owner', () => {
    render(<PublicProfilePage routeName="alice" />)

    const trigger = screen.getByRole('tab', { name: 'Activity' })
    fireEvent.click(trigger)

    expect(
      screen.getByRole('list', { name: 'Recent activities' }),
    ).toBeInTheDocument()
  })
})

describe('PublicProfilePage — loading state', () => {
  it('renders the main landmark while the bundle is still loading', () => {
    setQuery({ data: null, loading: true, error: null })

    render(<PublicProfilePage routeName="alice" />)

    expect(screen.getByTestId('public-profile-page')).toBeInTheDocument()
  })
})

describe('PublicProfilePage — bundle wiring', () => {
  it('forwards the route slug into the query variables', () => {
    render(<PublicProfilePage routeName="bob" />)

    const arg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: { username: string }
    }
    expect(arg.variables.username).toBe('bob')
  })

  it('re-runs the query when the viewer signs in (auth-conditional variables flip)', async () => {
    setAuth({ isAuthenticated: false, currentUserId: null, username: null })
    setQuery({ data: FULL_PAYLOAD, loading: false, error: null })

    render(<PublicProfilePage routeName="alice" />)

    const firstArg = mockUseUserProfileQuery.mock.calls[0]?.[0] as {
      variables: { includeAnalytics: boolean }
    }
    expect(firstArg.variables.includeAnalytics).toBe(false)

    setAuth({
      isAuthenticated: true,
      currentUserId: '0192f4d8-1001-7000-8000-000000000001',
      username: 'alice',
    })

    render(<PublicProfilePage routeName="alice" />)

    await waitFor(() => {
      const calls = mockUseUserProfileQuery.mock.calls
      const lastArg = calls.at(-1)?.[0] as {
        variables: { includeAnalytics: boolean }
      } | undefined
      expect(lastArg?.variables.includeAnalytics).toBe(true)
    })
  })
})
