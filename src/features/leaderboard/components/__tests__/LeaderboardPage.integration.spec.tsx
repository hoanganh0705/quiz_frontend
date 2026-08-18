

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
cleanup,
render,
screen,
waitFor,
fireEvent,
} from '@testing-library/react'
import { SWRConfig } from 'swr'

import {
useLeaderboard,
type LeaderboardEntryWithId,
} from '@/features/leaderboard/hooks/useLeaderboard'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'

import { LeaderboardPage } from '@/features/leaderboard/components/LeaderboardPage'

vi.mock('@/features/leaderboard/hooks/useLeaderboard', async () => {
const actual =
await vi.importActual<
typeof import('@/features/leaderboard/hooks/useLeaderboard')
    >('@/features/leaderboard/hooks/useLeaderboard')
return {
...actual,
useLeaderboard: vi.fn(),
  }
})

vi.mock('@/features/auth/hooks/use-auth-state', async () => {
const actual =
await vi.importActual<
typeof import('@/features/auth/hooks/use-auth-state')
    >('@/features/auth/hooks/use-auth-state')
return {
...actual,
useAuthState: vi.fn(),
  }
})

const useLeaderboardMock = vi.mocked(useLeaderboard)
const useAuthStateMock = vi.mocked(useAuthState)

function makeEntry(
overrides: Partial<LeaderboardEntryWithId> = {},
): LeaderboardEntryWithId {
return {
id: overrides.userId ?? 'user-1',
rank: 1,
denseRank: 1,
userId: 'user-1',
displayName: 'Alice',
avatarUrl: null,
xp: 100,
isTied: false,
isCurrentUser: false,
...overrides,
  }
}

function setHookReturn(overrides: Partial<ReturnType<typeof useLeaderboard>>) {
const stable = {
entries: [] as ReturnType<typeof useLeaderboard>['entries'],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null as ReturnType<typeof useLeaderboard>['error'],
refresh: vi.fn(async () => undefined),
retryBannerVisible: false,
...overrides,
  }
useLeaderboardMock.mockImplementation(() => stable)
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
  )
}

beforeEach(() => {
useLeaderboardMock.mockReset()
useAuthStateMock.mockReset()
useAuthStateMock.mockReturnValue({
isAuthenticated: false,
setAuthenticated: vi.fn(),
  })
})

afterEach(() => {
cleanup()
})

describe('LeaderboardPage — AC #1 (default period + period switching)', () => {
it('uses the default period `weekly` on first paint', () => {
setHookReturn({ entries: [] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(useLeaderboardMock).toHaveBeenCalledWith('weekly')
  })

it('re-invokes the hook with the newly-selected period on switch (cursor reset)', async () => {
setHookReturn({ entries: [] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(useLeaderboardMock).toHaveBeenLastCalledWith('weekly')
expect(useLeaderboardMock.mock.calls.length).toBe(1)

fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

await waitFor(() => {
expect(useLeaderboardMock).toHaveBeenLastCalledWith('monthly')
    })
expect(useLeaderboardMock.mock.calls.length).toBe(2)

fireEvent.click(screen.getByRole('button', { name: 'All-time' }))

await waitFor(() => {
expect(useLeaderboardMock).toHaveBeenLastCalledWith('all_time')
    })
expect(useLeaderboardMock.mock.calls.length).toBe(3)
  })
})

describe('LeaderboardPage — AC #2 (load-more appends entries)', () => {
it('exposes the load-more button when `hasMore === true`', () => {
setHookReturn({
entries: [makeEntry({ userId: 'u-1', rank: 1 })],
hasMore: true,
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.getByTestId('leaderboard-load-more')).toBeInTheDocument()
  })

it('clicking the load-more button calls `loadMore` (which the hook uses to append entries)', async () => {
const loadMore = vi.fn()
setHookReturn({
entries: [makeEntry({ userId: 'u-1', rank: 1 })],
hasMore: true,
loadMore,
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

const button = screen.getByTestId('leaderboard-load-more')
fireEvent.click(button)

await waitFor(() => {
expect(loadMore).toHaveBeenCalledTimes(1)
    })
  })

it('renders an appended entry list (combined page-1 + page-2 entries)', () => {
setHookReturn({
entries: [
makeEntry({ userId: 'u-1', rank: 1, displayName: 'Alice' }),
makeEntry({ userId: 'u-2', rank: 2, displayName: 'Bob' }),
makeEntry({ userId: 'u-3', rank: 3, displayName: 'Carol' }),
makeEntry({ userId: 'u-4', rank: 4, displayName: 'Dave' }),
makeEntry({ userId: 'u-5', rank: 5, displayName: 'Eve' }),
makeEntry({ userId: 'u-6', rank: 6, displayName: 'Frank' }),
      ],
hasMore: true,
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.getByText('Alice')).toBeInTheDocument()
expect(screen.getByText('Bob')).toBeInTheDocument()
expect(screen.getByText('Carol')).toBeInTheDocument()

expect(screen.getByText('Dave')).toBeInTheDocument()
expect(screen.getByText('Eve')).toBeInTheDocument()
expect(screen.getByText('Frank')).toBeInTheDocument()

expect(screen.getByTestId('leaderboard-load-more')).toBeInTheDocument()
  })
})

describe('LeaderboardPage — empty state', () => {
it('renders the empty state when `entries.length === 0` and `isLoading === false`', () => {
setHookReturn({ entries: [] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.getByTestId('leaderboard-empty-state')).toBeInTheDocument()
expect(
screen.getByText(
/no leaderboard data yet.*play some quizzes to populate the ranks/i,
      ),
    ).toBeInTheDocument()
  })

it('does NOT render the empty state while loading', () => {
setHookReturn({ isLoading: true, entries: [] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.getByTestId('leaderboard-skeleton')).toBeInTheDocument()
expect(screen.queryByTestId('leaderboard-empty-state')).toBeNull()
  })
})

describe('LeaderboardPage — skeleton on first paint and on period switch', () => {
it('renders the skeleton while loading on first paint', () => {
setHookReturn({ isLoading: true, entries: [] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.getByTestId('leaderboard-skeleton')).toBeInTheDocument()
  })

it('on period switch, the hook is re-invoked with the new period (the cursor primitive owns the loading state)', () => {
setHookReturn({ isLoading: false, entries: [makeEntry()] })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

expect(screen.queryByTestId('leaderboard-skeleton')).toBeNull()
expect(useLeaderboardMock).toHaveBeenLastCalledWith('weekly')

fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

expect(useLeaderboardMock).toHaveBeenLastCalledWith('monthly')
expect(useLeaderboardMock.mock.calls.length).toBe(2)
  })
})

describe('LeaderboardPage — self-entry highlight (auth gate + isCurrentUser)', () => {
it('highlights the self-entry row when `isAuthenticated === true` AND `entry.isCurrentUser === true`', () => {
useAuthStateMock.mockReturnValue({
isAuthenticated: true,
setAuthenticated: vi.fn(),
    })
setHookReturn({
entries: [
makeEntry({
userId: 'me',
rank: 5,
isCurrentUser: true,
displayName: 'Meee',
        }),
      ],
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

const selfRow = document.querySelector('[data-leaderboard-row="me"]')
expect(selfRow).not.toBeNull()
expect(selfRow).toHaveAttribute('aria-current', 'true')
  })

it('does NOT highlight when `isAuthenticated === false` (the auth gate wins)', () => {
useAuthStateMock.mockReturnValue({
isAuthenticated: false,
setAuthenticated: vi.fn(),
    })
setHookReturn({
entries: [
makeEntry({
userId: 'me',
rank: 5,
isCurrentUser: true,
displayName: 'Meee',
        }),
      ],
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

const selfRow = document.querySelector('[data-leaderboard-row="me"]')
expect(selfRow).not.toBeNull()
expect(selfRow).not.toHaveAttribute('aria-current')
  })

it('does NOT highlight other entries when the authenticated user is in the ranking', () => {
useAuthStateMock.mockReturnValue({
isAuthenticated: true,
setAuthenticated: vi.fn(),
    })
setHookReturn({
entries: [

makeEntry({ userId: 'u-4', rank: 4, displayName: 'Dave' }),
makeEntry({
userId: 'me',
rank: 5,
isCurrentUser: true,
displayName: 'Meee',
        }),
makeEntry({ userId: 'u-6', rank: 6, displayName: 'Frank' }),
      ],
    })

render(
<TestSwrProvider>
<LeaderboardPage />
</TestSwrProvider>,
    )

const selfRow = document.querySelector('[data-leaderboard-row="me"]')
expect(selfRow).not.toBeNull()
expect(selfRow).toHaveAttribute('aria-current', 'true')

const daveRow = document.querySelector('[data-leaderboard-row="u-4"]')
expect(daveRow).not.toBeNull()
expect(daveRow).not.toHaveAttribute('aria-current')

const frankRow = document.querySelector('[data-leaderboard-row="u-6"]')
expect(frankRow).not.toBeNull()
expect(frankRow).not.toHaveAttribute('aria-current')
  })
})
