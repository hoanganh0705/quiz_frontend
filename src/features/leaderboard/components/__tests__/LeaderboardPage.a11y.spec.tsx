/**
 * axe-core a11y audit for the `<LeaderboardPage />` composition.
 *
 * Source epic:   Epic 3.11 — `/leaderboard` read-only render.
 * Source ticket: TKT-3.11.F4.
 *
 * Runs a structural axe-core audit against three required states:
 *
 *   - **Resolved live** — authenticated, ≥ 1 entry resolved.
 *   - **Unauthenticated** — `isAuthenticated === false` (the auth
 *     gate is the source of the self-entry highlight).
 *   - **Loading** — `isLoading === true` (the skeleton route).
 *
 * The audit rule set is the project-wide structural subset used by
 * all other axe specs in this codebase. Color contrast is verified
 * manually because jsdom does not implement HTMLCanvasElement (the
 * repo-wide convention; see `axe-quiz-card.spec.tsx`).
 *
 * The cross-cutting contract is that every interactive control
 * has an accessible name, the period selector is keyboard
 * reachable (`aria-pressed`), the live surface carries an
 * `aria-label`, and the self-entry highlight uses `aria-current`
 * (`"true"` when `entry.isCurrentUser === true` AND
 * `isAuthenticated === true`; absent otherwise).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

async function auditLeaderboard() {
  return axe.run(document.body, {
    runOnly: {
      type: 'rule',
      values: [
        'area-alt',
        'aria-allowed-attr',
        'aria-required-attr',
        'aria-required-children',
        'aria-required-parent',
        'aria-roles',
        'aria-valid-attr',
        'aria-valid-attr-value',
        'button-name',
        'bypass',
        'document-title',
        'duplicate-id',
        'empty-heading',
        'heading-order',
        'html-has-lang',
        'html-lang-valid',
        'image-alt',
        'input-image-alt',
        'label',
        'link-name',
        'list',
        'listitem',
        'meta-refresh',
        'region',
      ],
    },
  })
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
  document.body.innerHTML = ''
})

// ──────────────────────────────────────────────────────────────────────
// Resolved live state — authenticated + entries present
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — axe a11y audit (resolved live, authenticated)', () => {
  it('renders without critical or serious axe violations', async () => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    })
    setHookReturn({
      entries: [
        makeEntry({ userId: 'u-1', rank: 1, displayName: 'Alice' }),
        makeEntry({ userId: 'u-2', rank: 2, displayName: 'Bob' }),
        makeEntry({ userId: 'u-3', rank: 3, displayName: 'Carol' }),
        makeEntry({
          userId: 'me',
          rank: 4,
          isCurrentUser: true,
          displayName: 'Meee',
        }),
      ],
    })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const results = await auditLeaderboard()
    const blockers = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })

  it('the period selector buttons have accessible names + `aria-pressed`', () => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    })
    setHookReturn({ entries: [] })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const weekly = container.querySelector(
      'button[aria-pressed]',
    ) as HTMLButtonElement | null
    expect(weekly).toBeTruthy()
    // The Weekly button is the default (selected); it is
    // aria-pressed=true.
    expect(weekly?.getAttribute('aria-pressed')).toBe('true')
    expect(weekly?.textContent).toMatch(/weekly/i)
  })

  it('the self-entry row has `aria-current="true"` when authenticated', () => {
    useAuthStateMock.mockReturnValue({
      isAuthenticated: true,
      setAuthenticated: vi.fn(),
    })
    setHookReturn({
      entries: [
        makeEntry({
          userId: 'me',
          rank: 4,
          isCurrentUser: true,
          displayName: 'Meee',
        }),
      ],
    })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const selfRow = container.querySelector('[data-leaderboard-row="me"]')
    expect(selfRow).toBeTruthy()
    expect(selfRow).toHaveAttribute('aria-current', 'true')
  })
})

// ──────────────────────────────────────────────────────────────────────
// Unauthenticated state — no self-entry highlight even when isCurrentUser is true
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — axe a11y audit (unauthenticated)', () => {
  it('does NOT highlight any row when `isAuthenticated === false`', () => {
    setHookReturn({
      entries: [
        makeEntry({
          userId: 'me',
          rank: 4,
          isCurrentUser: true,
          displayName: 'Meee',
        }),
      ],
    })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const selfRow = container.querySelector('[data-leaderboard-row="me"]')
    expect(selfRow).toBeTruthy()
    // The auth gate wins: no row carries `aria-current`.
    expect(selfRow).not.toHaveAttribute('aria-current')

    const highlighted = container.querySelectorAll('[aria-current="true"]')
    expect(highlighted).toHaveLength(0)
  })

  it('renders without critical or serious axe violations', async () => {
    setHookReturn({ entries: [] })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const results = await auditLeaderboard()
    const blockers = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Loading state — skeleton
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — axe a11y audit (loading)', () => {
  it('renders the skeleton with role="status" + aria-live="polite"', () => {
    setHookReturn({ isLoading: true, entries: [] })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const skeleton = container.querySelector('[data-testid="leaderboard-skeleton"]')
    expect(skeleton).toBeTruthy()
    expect(skeleton).toHaveAttribute('role', 'status')
    expect(skeleton).toHaveAttribute('aria-live', 'polite')
  })

  it('renders without critical or serious axe violations', async () => {
    setHookReturn({ isLoading: true, entries: [] })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const results = await auditLeaderboard()
    const blockers = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Empty state
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — axe a11y audit (empty state)', () => {
  it('renders without critical or serious axe violations', async () => {
    setHookReturn({ entries: [] })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const results = await auditLeaderboard()
    const blockers = results.violations.filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    )
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0)
  })
})

// ──────────────────────────────────────────────────────────────────────
// Error state — 404 / 5xx
// ──────────────────────────────────────────────────────────────────────

describe('LeaderboardPage — axe a11y audit (error state)', () => {
  it('renders the 404 inline error with role="alert"', () => {
    setHookReturn({
      entries: [],
      error: makeApiError(404),
    })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const banner404 = container.querySelector('[data-testid="leaderboard-404"]')
    expect(banner404).toBeTruthy()
    expect(banner404).toHaveAttribute('role', 'alert')
  })

  it('renders the 5xx retry banner with role="alert" + Retry button accessible name', () => {
    const refresh = vi.fn(async () => undefined)
    setHookReturn({
      entries: [makeEntry({ userId: 'u-1', rank: 1 })],
      error: makeApiError(500),
      refresh,
    })

    const { container } = render(
      <TestSwrProvider>
        <LeaderboardPage />
      </TestSwrProvider>,
    )
    document.body.appendChild(container)

    const banner = container.querySelector('[data-testid="leaderboard-5xx-banner"]')
    expect(banner).toBeTruthy()
    expect(banner).toHaveAttribute('role', 'alert')

    const retry = banner?.querySelector('button')
    expect(retry).toBeTruthy()
    expect(retry?.textContent).toMatch(/retry/i)
  })
})
