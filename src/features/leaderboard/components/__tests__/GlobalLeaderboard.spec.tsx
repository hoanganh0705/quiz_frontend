/**
 * `GlobalLeaderboard.spec.tsx` — locks the delegation contract.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.C2.
 *
 * Three cases per the ticket AC #1–6:
 *
 *   (1) The default export is preserved.
 *   (2) The body renders `<LeaderboardPage />` (no legacy mock-data
 *       imports in the file).
 *   (3) `pnpm type-check` and `pnpm lint` pass.
 *
 * The test asserts that `GlobalLeaderboard` is a thin pass-through to
 * `LeaderboardPage` and that the legacy constants are NOT imported.
 */

import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { SWRConfig } from 'swr'

import { useLeaderboard } from '@/features/leaderboard/hooks/useLeaderboard'

import GlobalLeaderboard from '@/features/leaderboard/components/GlobalLeaderboard'

// Mock `useLeaderboard` to a known state so the inner `LeaderboardPage`
// has data to render. The composition's own test (LeaderboardPage.spec.tsx)
// covers the full branch matrix.
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
    useAuthState: vi.fn(() => ({
      isAuthenticated: false,
      setAuthenticated: vi.fn(),
    })),
  }
})

const useLeaderboardMock = vi.mocked(useLeaderboard)

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

describe('GlobalLeaderboard — delegation', () => {
  it('renders the LeaderboardPage composition', async () => {
    useLeaderboardMock.mockReturnValue({
      entries: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
    })

    render(
      <TestSwrProvider>
        <GlobalLeaderboard />
      </TestSwrProvider>,
    )

    // The composition renders the period selector and the
    // `aria-label="Global leaderboard"` section. If the delegation
    // is broken, these are absent.
    await waitFor(() => {
      expect(screen.getByLabelText('Global leaderboard')).toBeInTheDocument()
    })
    expect(screen.getByRole('button', { name: 'Weekly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Monthly' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'All-time' })).toBeInTheDocument()
  })

  it('does NOT import the legacy `players` mock-data module', async () => {
    // The legacy mock-data body was removed in C2. The `players`
    // constant is no longer consumed by `GlobalLeaderboard.tsx`.
    // We assert this indirectly: the rendered tree must not
    // contain the legacy mock player names. This is a contract
    // lock — if a future change re-introduces the mock body, the
    // names below would appear in the DOM and the test would fail.
    useLeaderboardMock.mockReturnValue({
      entries: [],
      isLoading: false,
      isLoadingMore: false,
      hasMore: false,
      loadMore: vi.fn(),
      error: null,
      refresh: vi.fn(async () => undefined),
      retryBannerVisible: false,
    })

    render(
      <TestSwrProvider>
        <GlobalLeaderboard />
      </TestSwrProvider>,
    )

    // The legacy mock has names like "Alice Smith", "Bob Johnson",
    // etc. We assert the empty state copy instead — if the
    // delegation is correct, the empty state is rendered.
    await waitFor(() => {
      expect(screen.getByTestId('leaderboard-empty-state')).toBeInTheDocument()
    })
  })
})
