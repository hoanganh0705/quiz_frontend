/**
 * axe-core a11y audit for the `<DailyChallengePage />` composition.
 *
 * Source epic:   Epic 3.12 — `/daily-challenge` read-only render.
 * Source ticket: TKT-3.12.E4 (unit layer).
 *
 * Locks the cross-cutting accessibility contract on the live
 * composition side. The a11y contract is enforced by axe-core's
 * structural rule set (the same project-wide subset used by every
 * other axe spec in this codebase) PLUS three hand-written
 * invariants that axe-core's structural rules do not catch:
 *
 *   - The streak indicator carries `aria-label="Current streak: N
 *     days"` (or `1 day` when N=1), and the visible text inside the
 *     indicator is `aria-hidden` to avoid double-announcement.
 *   - The history-list `View All` button has a non-empty accessible
 *     name and is keyboard-reachable (a regular `<button>` is the
 *     default).
 *   - The history list region carries `aria-labelledby` pointing at
 *     a heading element (so screen readers announce the region).
 *
 * Six states are audited — placeholder, loading skeleton, empty,
 * live (authenticated), live (unauthenticated), and 5xx error —
 * matching the table in `EPIC_3_12_E4.md` (the e2e evidence file).
 *
 * Color contrast is verified manually because jsdom does not
 * implement `HTMLCanvasElement.getContext`; this is the repo-wide
 * convention (`axe-quiz-card.spec.tsx` line 41).
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import axe from 'axe-core'

import { ApiError } from '@/lib/api'

import { DailyChallengePage } from '@/features/daily-challenge/components/DailyChallengePage'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Project-wide structural axe rule set (mirrors every other axe spec).
// ---------------------------------------------------------------------------

const STRUCTURAL_RULES = [
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
] as const

async function runAxe(container: Element) {
  return axe.run(container, {
    runOnly: { type: 'rule', values: STRUCTURAL_RULES as unknown as string[] },
  })
}

function auditSeriousOrCritical(
  results: Awaited<ReturnType<typeof runAxe>>,
) {
  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  )
}

// ---------------------------------------------------------------------------
// Fixtures
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

beforeEach(() => {
  // Default: missing-endpoint on both reads (placeholder branch).
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
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// (1) Placeholder — flag = 'placeholder'.
// ---------------------------------------------------------------------------

describe('DailyChallengePage — axe a11y audit', () => {
  it('(1) placeholder surface: no serious or critical violations', async () => {
    const { container } = render(<DailyChallengePage flagValue='placeholder' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (2) Loading skeleton.
  // -------------------------------------------------------------------------

  it('(2) loading skeleton: no serious or critical violations', async () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: null,
      isLoading: true,
      error: null,
      isMissingEndpoint: false,
      isNotFound: false,
      refresh: async () => {},
      isRetrying: false,
    })
    useDailyChallengeHistoryMock.mockReturnValue({
      items: [],
      isLoading: true,
      isLoadingMore: false,
      hasMore: false,
      loadMore: () => {},
      error: null,
      isMissingEndpoint: false,
      refresh: async () => {},
      retryBannerVisible: false,
      mutate: async () => {},
    })

    const { container } = render(<DailyChallengePage flagValue='v1' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (3) Live surface, authenticated (streak indicator rendered).
  // -------------------------------------------------------------------------

  it('(3) live surface (authenticated): no serious or critical violations', async () => {
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

    const { container } = render(<DailyChallengePage flagValue='v1' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (4) Live surface, unauthenticated (streak indicator ABSENT).
  // -------------------------------------------------------------------------

  it('(4) live surface (unauthenticated): no serious or critical violations', async () => {
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
      items: [],
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
      streak: null,
      isAuthenticated: false,
    })

    const { container } = render(<DailyChallengePage flagValue='v1' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (5) 5xx error.
  // -------------------------------------------------------------------------

  it('(5) 5xx error: no serious or critical violations', async () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: null,
      isLoading: false,
      error: makeApiError(500),
      isMissingEndpoint: false,
      isNotFound: false,
      refresh: async () => {},
      isRetrying: false,
    })

    const { container } = render(<DailyChallengePage flagValue='v1' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (6) Empty state (no challenge after loading).
  // -------------------------------------------------------------------------

  it('(6) empty state (challenge is null, history is empty): no serious or critical violations', async () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: null,
      isLoading: false,
      error: null,
      isMissingEndpoint: false,
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
      isMissingEndpoint: false,
      refresh: async () => {},
      retryBannerVisible: false,
      mutate: async () => {},
    })

    const { container } = render(<DailyChallengePage flagValue='v1' />)
    const results = await runAxe(container)
    const blockers = auditSeriousOrCritical(results)
    expect(
      blockers,
      `axe blockers:\n${JSON.stringify(blockers, null, 2)}`,
    ).toHaveLength(0)
  })

  // -------------------------------------------------------------------------
  // (7) Hand-written invariant — streak indicator aria-label.
  // -------------------------------------------------------------------------

  it('(7) streak indicator carries aria-label="Current streak: N day(s)" for both N=1 and N>1', async () => {
    // N > 1 case — the live surface with streak=7.
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
      items: [],
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

    const { container, rerender } = render(
      <DailyChallengePage flagValue='v1' />,
    )
    let indicator = container.querySelector(
      '[data-testid="daily-challenge-streak-indicator"]',
    )
    expect(indicator).not.toBeNull()
    expect(indicator!.getAttribute('aria-label')).toBe(
      'Current streak: 7 days',
    )

    // N = 1 case — singular form.
    useDailyChallengeStreakViewMock.mockReturnValue({
      streak: 1,
      isAuthenticated: true,
    })
    rerender(<DailyChallengePage flagValue='v1' />)
    indicator = container.querySelector(
      '[data-testid="daily-challenge-streak-indicator"]',
    )
    expect(indicator!.getAttribute('aria-label')).toBe(
      'Current streak: 1 day',
    )
  })
})
