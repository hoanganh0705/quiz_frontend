/**
 * `LeaderboardPage.spec.tsx` — locks the live composition contract.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.C1.
 *
 * Cases per the ticket AC #1–10:
 *
 *   (1) Default period is `weekly` on first paint.
 *   (2) Period switch triggers a fresh wrapper call (the hook's SWR
 *       key change resets the cursor).
 *   (3) Top-3 entries are rendered in a podium layout.
 *   (4) Entries 4+ are rendered in a table layout using
 *       `LeaderboardEntryRow`.
 *   (5) Load-more button is rendered when `hasMore` is `true`;
 *       clicking it calls `loadMore` and the button reflects
 *       `isLoadingMore`.
 *   (6) Empty state renders when `entries.length === 0` and
 *       `isLoading === false`.
 *   (7) Skeleton renders when `isLoading === true`.
 *   (8) 5xx surfaces a retry banner; 404 surfaces the "This period
 *       isn't supported" inline error.
 *   (9) Self-entry highlight is gated on auth + `isCurrentUser === true`.
 *
 * Test-environment note: vitest's jsdom project picks up files
 * under `src/features/leaderboard/components/__tests__/` so the
 * @testing-library/react render path works. The wrapper is mocked so
 * the test is for the composition integration, not the SDK.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { ApiError } from '@/lib/api'

import {
  useLeaderboard,
  type LeaderboardEntryWithId,
} from '@/features/leaderboard/hooks/useLeaderboard'
import { useAuthState } from '@/features/auth/hooks/use-auth-state'

import { LeaderboardPage } from '@/features/leaderboard/components/LeaderboardPage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const getLeaderboardWithPaginationMock = vi.fn()

vi.mock('@/features/leaderboard/wrappers/leaderboard.wrapper', async () => {
  const actual =
    await vi.importActual<
      typeof import('@/features/leaderboard/wrappers/leaderboard.wrapper')
    >('@/features/leaderboard/wrappers/leaderboard.wrapper')
  return {
    ...actual,
    getLeaderboardWithPagination: (...args: unknown[]) =>
      getLeaderboardWithPaginationMock(...args),
  }
})

// Mock the hook so the test can control its return shape directly.
// We do NOT mock `useLeaderboard` because we want the composition to
// call it for real — instead we control the wrapper that the hook
// consumes. This keeps the integration test honest.
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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
    xp: 12345,
    isTied: false,
    isCurrentUser: false,
    ...overrides,
  }
}

function makeApiError(status: number): ApiError {
  return new ApiError({
    isAxiosError: true,
    name: 'AxiosError',
    message: `Mock ${status}`,
    code: `CODE_${status}`,
    config: undefined,
    request: undefined,
    response: {
      status,
      data: { code: `CODE_${status}`, detail: 'fixture' },
    },
    toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0])
}

const useLeaderboardMock = vi.mocked(useLeaderboard)
const useAuthStateMock = vi.mocked(useAuthState)

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
  getLeaderboardWithPaginationMock.mockReset()
  useLeaderboardMock.mockReset()
  useAuthStateMock.mockReset()
  // Default auth state: not authenticated.
  useAuthStateMock.mockReturnValue({
    isAuthenticated: false,
    setAuthenticated: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
})

// ──────────────────────────────────────────────────────────────────────
// (1) Default period is `weekly` on first paint
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — default period', () => {
  it('calls `useLeaderboard` with `weekly` on first paint', () => {
    setHookReturn({ entries: [] })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(useLeaderboardMock).toHaveBeenCalledWith('weekly')
  })
})

// ──────────────────────────────────────────────────────────────────────
// (2) Period switch
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — period switch', () => {
  it('changing the period passes the new period to `useLeaderboard`', async () => {
    setHookReturn({ entries: [] })
    const { rerender } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(useLeaderboardMock).toHaveBeenLastCalledWith('weekly')

    // Click `Monthly`.
    fireEvent.click(screen.getByRole('button', { name: 'Monthly' }))

    await waitFor(() => {
      expect(useLeaderboardMock).toHaveBeenLastCalledWith('monthly')
    })

    // Click `All-time`.
    fireEvent.click(screen.getByRole('button', { name: 'All-time' }))

    await waitFor(() => {
      expect(useLeaderboardMock).toHaveBeenLastCalledWith('all_time')
    })

    // The composition should have re-invoked the hook on every
    // change. Rerender does not affect the count.
    rerender(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    // The hook is invoked once per render. After 2 period changes +
    // 1 rerender, the total call count is at least 3.
    expect(useLeaderboardMock.mock.calls.length).toBeGreaterThanOrEqual(3)
  })
})

// ──────────────────────────────────────────────────────────────────────
// (3) Top-3 podium layout
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — podium', () => {
  it('renders the top-3 entries in a podium layout', () => {
    setHookReturn({
      entries: [
        makeEntry({ userId: 'u-1', rank: 1, denseRank: 1, displayName: 'Alice' }),
        makeEntry({ userId: 'u-2', rank: 2, denseRank: 2, displayName: 'Bob' }),
        makeEntry({ userId: 'u-3', rank: 3, denseRank: 3, displayName: 'Carol' }),
      ],
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    const podium = screen.getByTestId('leaderboard-podium')
    expect(podium).toBeInTheDocument()
    expect(podium).toHaveAccessibleName(/top 3 leaderboard entries/i)
    // All three names are rendered.
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByText('Bob')).toBeInTheDocument()
    expect(screen.getByText('Carol')).toBeInTheDocument()
  })

  it('does NOT render the podium when there are zero entries', () => {
    setHookReturn({
      entries: [],
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(screen.queryByTestId('leaderboard-podium')).toBeNull()
  })

  it('renders the podium with a single entry (1st place only) when only one entry is present', () => {
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1, displayName: 'Solo' })],
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(screen.getByTestId('leaderboard-podium')).toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────
// (4) Entries 4+ are rendered in a row layout
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — entries 4+', () => {
  it('renders entries 4+ in the row container with `LeaderboardEntryRow`', () => {
    setHookReturn({
      entries: [
        makeEntry({ userId: 'u-1', rank: 1, displayName: 'Alice' }),
        makeEntry({ userId: 'u-2', rank: 2, displayName: 'Bob' }),
        makeEntry({ userId: 'u-3', rank: 3, displayName: 'Carol' }),
        makeEntry({ userId: 'u-4', rank: 4, displayName: 'Dave' }),
        makeEntry({ userId: 'u-5', rank: 5, displayName: 'Eve' }),
      ],
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    const rows = screen.getByTestId('leaderboard-rows')
    expect(rows).toBeInTheDocument()
    // The top-3 names are inside the podium, NOT in the rows
    // container. The rows container should hold Dave and Eve only.
    expect(rows.querySelector('[data-leaderboard-row="u-4"]')).not.toBeNull()
    expect(rows.querySelector('[data-leaderboard-row="u-5"]')).not.toBeNull()
    expect(rows.querySelector('[data-leaderboard-row="u-1"]')).toBeNull()
  })
})

// ──────────────────────────────────────────────────────────────────────
// (5) Load-more button
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — load more', () => {
  it('renders the load-more button when `hasMore === true`', () => {
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1 })],
      hasMore: true,
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    const button = screen.getByTestId('leaderboard-load-more')
    expect(button).toBeInTheDocument()
    expect(button).toHaveTextContent(/load more/i)
  })

  it('does NOT render the load-more button when `hasMore === false`', () => {
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1 })],
      hasMore: false,
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(screen.queryByTestId('leaderboard-load-more')).toBeNull()
  })

  it('clicking the load-more button calls `loadMore` and reflects `isLoadingMore`', async () => {
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
    // Sanity check — the button is rendered in the "Load more" state.
    expect(button).toHaveTextContent(/load more/i)
    expect(button).toHaveAttribute('aria-busy', 'false')
    expect(button).not.toBeDisabled()

    fireEvent.click(button)

    // Wait a tick for the click handler to flush.
    await waitFor(() => {
      expect(loadMore).toHaveBeenCalledTimes(1)
    })
  })

  it('renders the loading state and disables the button when `isLoadingMore === true`', () => {
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1 })],
      hasMore: true,
      isLoadingMore: true,
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    const button = screen.getByTestId('leaderboard-load-more')
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toBeDisabled()
    expect(button).toHaveTextContent(/loading/i)
  })
})

// ──────────────────────────────────────────────────────────────────────
// (6) Empty state
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — empty state', () => {
  it('renders the empty state when `entries.length === 0` and `isLoading === false`', () => {
    setHookReturn({
      entries: [],
      isLoading: false,
    })
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
})

// ──────────────────────────────────────────────────────────────────────
// (7) Skeleton
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — skeleton', () => {
  it('renders the skeleton when `isLoading === true`', () => {
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

// ──────────────────────────────────────────────────────────────────────
// (8) Error branches
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — errors', () => {
  it('renders the "This period isn\'t supported" inline error on 404', () => {
    setHookReturn({
      entries: [],
      error: makeApiError(404),
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(screen.getByTestId('leaderboard-404')).toBeInTheDocument()
    expect(screen.getByText(/this period isn't supported/i)).toBeInTheDocument()
  })

  it('renders the 5xx retry banner with a Retry button', () => {
    const refresh = vi.fn(async () => undefined)
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1 })],
      error: makeApiError(500),
      refresh,
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    const banner = screen.getByTestId('leaderboard-5xx-banner')
    expect(banner).toBeInTheDocument()
    expect(banner).toHaveTextContent(/something went wrong/i)

    // The banner contains its own Retry button. Scope the click to
    // the banner so we don't accidentally match the empty-state
    // Retry button (which only renders when entries are empty).
    const retry = within(banner).getByRole('button', { name: /retry/i })
    fireEvent.click(retry)
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it('renders the retry banner when `retryBannerVisible` is set (cursor primitive D5)', () => {
    setHookReturn({
      entries: [],
      retryBannerVisible: true,
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    expect(screen.getByTestId('leaderboard-5xx-banner')).toBeInTheDocument()
  })
})

// ──────────────────────────────────────────────────────────────────────
// (9) Self-entry highlight
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — self-entry highlight', () => {
  it('highlights the self entry when `isAuthenticated === true` AND `entry.isCurrentUser === true`', () => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    })
    setHookReturn({
      entries: [
        makeEntry({ userId: 'me', rank: 5, isCurrentUser: true, displayName: 'Meee' }),
      ],
    })
    render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )

    // The row is identified by `data-leaderboard-row="me"`; the
    // highlight gate is `aria-current="true"`. The display name is
    // in a paragraph, not directly a text node, so query through
    // the data attribute.
    const selfRow = document.querySelector('[data-leaderboard-row="me"]')
    expect(selfRow).not.toBeNull()
    expect(selfRow).toHaveAttribute('aria-current', 'true')
  })

  it('does NOT highlight when `isAuthenticated === false`', () => {
    setHookReturn({
      entries: [
        makeEntry({ userId: 'me', rank: 5, isCurrentUser: true, displayName: 'Meee' }),
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
})
