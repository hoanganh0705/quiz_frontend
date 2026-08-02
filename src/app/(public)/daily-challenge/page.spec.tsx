/**
 * `page.spec.tsx` — page-level integration tests for the
 * `/daily-challenge` route boundary.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source story:  `projectDocs/Epics/PHASE_3_EPICS.md` → Story 3.12.
 * Source ticket: TKT-3.12.E1.
 *
 * The page composition (`app/(public)/daily-challenge/page.tsx`) is
 * the single read site for the `dailyChallengePage` feature flag
 * (TKT-3.12.D2) and forwards the resolved value to
 * `<DailyChallengeMainContent flagValue={flagValue} />`. This spec
 * locks the boundary contract end-to-end:
 *
 *   (1) When the flag resolves to `'placeholder'` at the page
 *       boundary, the page renders `<DailyChallengePlaceholder />`
 *       (the placeholder surface) — even when the underlying
 *       hooks report a successful, non-missing-endpoint response.
 *   (2) When the flag resolves to `'v1'` and the hooks report
 *       `kind: 'missing-endpoint'`, the page still renders the
 *       placeholder surface (the hook-side missing-endpoint guard
 *       wins regardless of the flag value).
 *   (3) When the flag resolves to `'v1'` and the hooks resolve
 *       successfully with a challenge + non-empty history, the
 *       page renders the live card + history list (the full
 *       live surface is reached).
 *
 * ## Module-init capture trap
 *
 * `page.tsx` reads the flag once at module-evaluation time
 * (`const flagValue = getFeatureFlagValue('dailyChallengePage')`).
 * If a single module import is shared across tests, only the
 * first test's flag value would be captured; subsequent
 * `mockReturnValue(...)` updates would be ignored.
 *
 * The standard vitest pattern to test module-init captures is to
 * call `vi.resetModules()` and `await import(...)` per scenario.
 * Each `beforeEach` here resets the modules; each test re-imports
 * `Page` so the `flagValue` constant is re-evaluated against the
 * current `getFeatureFlagValueMock.mockReturnValue(...)`.
 */

import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

// ---------------------------------------------------------------------------
// Mocks — order matters; the feature-flags mock must be declared before
// importing `page.tsx` because `page.tsx` calls `getFeatureFlagValue` at
// module-init time.
//
// `vi.hoisted` lifts the mock-fn declarations so the `vi.mock` factory
// below — which is hoisted to the top of the file by vitest — can
// reference them without a "Cannot access before initialization"
// temporal-dead-zone error. The factory returns the bare `vi.fn()`
// reference directly so the imported symbol and the spec's assertions
// share the same function identity.
// ---------------------------------------------------------------------------

const { getFeatureFlagValueMock, isFeatureEnabledMock } = vi.hoisted(() => ({
  getFeatureFlagValueMock: vi.fn(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (_flag: 'dailyChallengePage'): 'v1' | 'placeholder' => 'placeholder',
  ),
  isFeatureEnabledMock: vi.fn(),
}))

vi.mock('@/lib/feature-flags', () => ({
  getFeatureFlagValue: getFeatureFlagValueMock,
  isFeatureEnabled: isFeatureEnabledMock,
  FEATURE_FLAGS: ['dailyChallengePage'],
}))

// `vi.mock` for hooks is hoisted; these mocks don't depend on the
// flag value, but the `useDailyChallenge*` factories must return the
// same `vi.fn()` reference each call so individual `mockReturnValue`
// updates stick.
const useDailyChallengeTodayMock = vi.fn()
const useDailyChallengeHistoryMock = vi.fn()
const useDailyChallengeStreakViewMock = vi.fn()

vi.mock(
  '@/features/daily-challenge/hooks/useDailyChallengeToday',
  () => ({
    useDailyChallengeToday: () => useDailyChallengeTodayMock(),
  }),
)

vi.mock(
  '@/features/daily-challenge/hooks/useDailyChallengeHistory',
  () => ({
    useDailyChallengeHistory: () => useDailyChallengeHistoryMock(),
  }),
)

vi.mock(
  '@/features/daily-challenge/hooks/useDailyChallengeStreakView',
  () => ({
    useDailyChallengeStreakView: () => useDailyChallengeStreakViewMock(),
  }),
)

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: () => {}, push: () => {} }),
}))

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeChallenge() {
  return {
    id: 'challenge-1',
    date: '2026-08-02T00:00:00.000Z',
    quizId: 'quiz-1',
    category: 'Science',
    totalQuestions: 5,
    rewardXp: 100,
  }
}

async function loadPage() {
  const mod = await import('./page')
  return mod.default
}

/** Set all three hook mocks to a "missing-endpoint" default. */
function setMissingEndpointDefaults() {
  useDailyChallengeTodayMock.mockReturnValue({
    challenge: null,
    isLoading: false,
    error: null,
    isMissingEndpoint: true,
    isNotFound: false,
    refresh: async () => {},
    isRetrying: false,
  })
  useDailyChallengeHistoryMock.mockReturnValue({
    items: [],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: () => {},
    error: null,
    isMissingEndpoint: true,
    refresh: async () => {},
    retryBannerVisible: false,
    mutate: async () => {},
  })
  useDailyChallengeStreakViewMock.mockReturnValue({
    streak: null,
    isAuthenticated: false,
  })
}

/** Set all three hook mocks to a successful "live" resolution. */
function setLiveDefaults() {
  useDailyChallengeTodayMock.mockReturnValue({
    challenge: makeChallenge(),
    isLoading: false,
    error: null,
    isMissingEndpoint: false,
    isNotFound: false,
    refresh: async () => {},
    isRetrying: false,
  })
  useDailyChallengeHistoryMock.mockReturnValue({
    items: [
      {
        id: 'h-1',
        date: '2026-08-01T00:00:00.000Z',
        category: 'Math',
        score: 80,
        rank: 5,
        isTopTen: true,
      },
    ],
    isLoading: false,
    isLoadingMore: false,
    hasMore: false,
    loadMore: () => {},
    error: null,
    isMissingEndpoint: false,
    refresh: async () => {},
    retryBannerVisible: false,
    mutate: async () => {},
  })
  useDailyChallengeStreakViewMock.mockReturnValue({
    streak: 7,
    isAuthenticated: true,
  })
}

beforeEach(() => {
  // Reset modules so `page.tsx` re-evaluates `const flagValue` against
  // the freshly-mocked `getFeatureFlagValueMock` for every test.
  vi.resetModules()
  getFeatureFlagValueMock.mockReset()
  getFeatureFlagValueMock.mockReturnValue('placeholder')
  setMissingEndpointDefaults()
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// (1) Flag = 'placeholder' renders the placeholder surface.
// ---------------------------------------------------------------------------

describe('Daily-challenge page boundary', () => {
  it('(1) renders the placeholder when the flag resolves to "placeholder" at the route boundary', async () => {
    getFeatureFlagValueMock.mockReturnValue('placeholder')
    // Even when the hooks would resolve with success, the flag wins
    // and the placeholder is the only surface rendered.
    setLiveDefaults()

    const Page = await loadPage()
    const { container } = render(<Page />)

    // The route chrome is preserved.
    expect(
      screen.getByRole('heading', { name: /daily challenge/i, level: 1 }),
    ).toBeInTheDocument()

    // The placeholder surface is what the `<DailyChallengeMainContent>`
    // renders via `<DailyChallengePage>`.
    expect(
      container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-placeholder"]'),
    ).not.toBeNull()

    // The today-card is gated behind the flag and must not render.
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).toBeNull()

    // The flag was read exactly once at module-init.
    expect(getFeatureFlagValueMock).toHaveBeenCalledTimes(1)
    expect(getFeatureFlagValueMock).toHaveBeenCalledWith(
      'dailyChallengePage',
    )
  })

  // -------------------------------------------------------------------------
  // (2) Flag = 'v1' + hook reports missing-endpoint → placeholder wins.
  // -------------------------------------------------------------------------

  it('(2) renders the placeholder when the flag is "v1" but the wrapper reports missing-endpoint', async () => {
    getFeatureFlagValueMock.mockReturnValue('v1')
    // The default mock has `isMissingEndpoint: true` on both reads.
    setMissingEndpointDefaults()

    const Page = await loadPage()
    const { container } = render(<Page />)

    expect(
      container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // (3) Flag = 'v1' + hooks resolve with data → live surface renders.
  // -------------------------------------------------------------------------

  it('(3) renders the live surface (card + history) when the flag is "v1" AND the hooks resolve with data', async () => {
    getFeatureFlagValueMock.mockReturnValue('v1')
    setLiveDefaults()

    const Page = await loadPage()
    const { container } = render(<Page />)

    // The route header is preserved in either branch.
    expect(
      screen.getByRole('heading', { name: /daily challenge/i, level: 1 }),
    ).toBeInTheDocument()

    expect(
      container.querySelector('[data-testid="daily-challenge-page-live"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-history-list"]'),
    ).not.toBeNull()
  })

  // -------------------------------------------------------------------------
  // (4) The page never 404s — every branch renders SOMETHING.
  // -------------------------------------------------------------------------

  it('(4) renders without throwing in placeholder, missing-endpoint, and live branches (never 404s)', async () => {
    // Placeholder.
    getFeatureFlagValueMock.mockReturnValue('placeholder')
    setLiveDefaults()
    {
      const Page = await loadPage()
      expect(() => render(<Page />)).not.toThrow()
      cleanup()
    }

    // Missing-endpoint via wrapper.
    vi.resetModules()
    getFeatureFlagValueMock.mockReset()
    getFeatureFlagValueMock.mockReturnValue('v1')
    setMissingEndpointDefaults()
    {
      const Page = await loadPage()
      expect(() => render(<Page />)).not.toThrow()
      cleanup()
    }

    // Live.
    vi.resetModules()
    getFeatureFlagValueMock.mockReset()
    getFeatureFlagValueMock.mockReturnValue('v1')
    setLiveDefaults()
    {
      const Page = await loadPage()
      expect(() => render(<Page />)).not.toThrow()
    }
  })
})
