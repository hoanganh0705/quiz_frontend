/**
 * `DailyChallengePage.spec.tsx` — locks the branch coverage of the live
 * composition (TKT-3.12.C1).
 *
 * Eleven cases per the ticket's testing checklist:
 *
 *   (1) Flag = 'placeholder' → renders the placeholder surface.
 *   (2) Flag = 'v1' + today hook reports `isMissingEndpoint` →
 *       placeholder (today-only missing-endpoint is sufficient).
 *   (3) Flag = 'v1' + empty history + today resolves → empty-state
 *       (NOT placeholder). Phase 3 (S-14): history `isMissingEndpoint`
 *       is decoupled from an empty `items` array.
 *   (4) Both hooks `isLoading: true` → skeleton.
 *   (5) Both hooks resolved with `challenge: null` and empty items →
 *       empty-state copy + history list (which delegates to its own
 *       empty state).
 *   (6) Both hooks resolve with a challenge and non-empty items →
 *       live surface (today card + streak + history list).
 *   (7) `hasMore: true` + click on View All → `loadMore` is called.
 *   (8) Auth=false → streak indicator NOT rendered.
 *   (9) 5xx today error → transient alert copy + the today card is
 *       absent.
 *  (10) History error → graceful degradation alert; today card still
 *       renders.
 *
 * The hooks are mocked because the test is for the composition's
 * branch-coverage, not for the SWR / AbortController lifecycle (those
 * are tested at the hook level). The presentational children are
 * rendered for real — they have their own specs (B2 / B3) — so the
 * composition test exercises the wiring.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { ApiError } from '@/lib/api'

import { DailyChallengePage } from '@/features/daily-challenge/components/DailyChallengePage'
import type { DailyChallengeView } from '@/features/daily-challenge/types/dto'
import type { DailyChallengeHistoryItemWithId } from '@/features/daily-challenge/hooks/useDailyChallengeHistory'

// ---------------------------------------------------------------------------
// Mocks — the three Batch B hooks + the play hook
// ---------------------------------------------------------------------------

const useDailyChallengeTodayMock = vi.fn()
const useDailyChallengeHistoryMock = vi.fn()
const useDailyChallengeStreakViewMock = vi.fn()
const useDailyChallengePlayMock = vi.fn()

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

vi.mock(
  '@/features/daily-challenge/hooks/useDailyChallengePlay',
  () => ({
    useDailyChallengePlay: () => useDailyChallengePlayMock(),
  }),
)

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeChallenge(
  overrides: Partial<DailyChallengeView> = {},
): DailyChallengeView {
  return {
    id: 'challenge-1',
    date: '2026-08-02T00:00:00.000Z',
    quizId: 'quiz-1',
    quizTitle: 'Solar System Trivia',
    slug: 'solar-system-trivia',
    category: 'medium',
    difficulty: 'medium',
    totalQuestions: 5,
    rewardXp: 100,
    expiresAt: '2026-08-03T00:00:00.000Z',
    status: 'completed',
    scorePercent: 80,
    rank: 5,
    ...overrides,
  }
}

function makeHistoryItem(
  overrides: Partial<DailyChallengeHistoryItemWithId> = {},
): DailyChallengeHistoryItemWithId {
  return {
    id: '2026-08-01T00:00:00.000Z-quiz-1',
    date: '2026-08-01T00:00:00.000Z',
    quizId: 'quiz-1',
    quizTitle: 'Solar System Trivia',
    slug: 'solar-system-trivia',
    difficulty: 'medium',
    category: 'medium',
    score: 80,
    rank: 5,
    isTopTen: true,
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

beforeEach(() => {
  // Default: missing-endpoint on both reads (placeholder branch
  // default in the A1-locked Phase 3 default). Individual tests
  // override as needed.
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
  // Default for the play hook: idle, no questions, no submit. Tests
  // that exercise the live branch's play surface do not need to
  // re-mock — they only assert the surface is mounted.
  useDailyChallengePlayMock.mockReturnValue({
    questions: [],
    currentIndex: 0,
    totalQuestions: 0,
    status: 'idle',
    lastRevealCorrect: null,
    finalScore: null,
    lastError: null,
    isQuizLoading: false,
    submitAnswer: vi.fn(),
    advance: vi.fn(),
    reset: vi.fn(),
  })
})

afterEach(() => {
  cleanup()
})

// ---------------------------------------------------------------------------
// (1) placeholder via flag
// ---------------------------------------------------------------------------

describe('DailyChallengePage — placeholder', () => {
  it('(1) renders the placeholder when the flag is "placeholder"', () => {
    useDailyChallengeStreakViewMock.mockReturnValue({
      streak: 0,
      isAuthenticated: true,
    })
    // hooks return ok data, but flag forces placeholder
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
      items: [makeHistoryItem()],
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

    const { container } = render(<DailyChallengePage flagValue='placeholder' />)

    expect(
      container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-placeholder"]'),
    ).not.toBeNull()
    // The today-card must not be rendered.
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).toBeNull()
  })

  it('(2) renders the placeholder when the "today" hook reports isMissingEndpoint', () => {
    // Note: isMissingEndpoint is already true in the default mock.
    const { container } = render(<DailyChallengePage flagValue='v1' />)
    expect(
      container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
  })

  it('(3) renders the empty-state branch (NOT the placeholder) when history is empty but today resolves', () => {
    // Phase 3 (S-14) fix: history's `isMissingEndpoint` is no longer
    // conflated with an empty `items` array. An empty history is a
    // legitimate "no past challenges yet" outcome and must render the
    // empty-state branch, not the placeholder. Only the explicit
    // flag (`flagValue === 'placeholder'`) or a future SDK-drift
    // missing-endpoint signal on `today` triggers the placeholder.
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

    const { container } = render(<DailyChallengePage flagValue='v1' />)

    expect(
      container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).toBeNull()
    // Live branch: today card renders, history list delegates to its
    // empty-state when items is empty (legitimate "no history yet").
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-history-empty-state"]'),
    ).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// (4) skeleton (loading branch)
// ---------------------------------------------------------------------------

describe('DailyChallengePage — loading skeleton', () => {
  it('(4) renders the skeleton when either hook is loading', () => {
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

    expect(
      container.querySelector('[data-testid="daily-challenge-page-skeleton"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-card-skeleton"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-history-skeleton"]'),
    ).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// (5) empty state
// ---------------------------------------------------------------------------

describe('DailyChallengePage — empty state', () => {
  it('(5) renders the "no challenge today" copy when challenge is null and items are empty', () => {
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

    expect(
      container.querySelector('[data-testid="daily-challenge-page-empty"]'),
    ).not.toBeNull()
    // The history-empty-state sub-component is rendered when the
    // history list's `items` is empty (the list delegates).
    expect(
      container.querySelector('[data-testid="daily-challenge-history-empty-state"]'),
    ).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// (6) live surface
// ---------------------------------------------------------------------------

describe('DailyChallengePage — live', () => {
  it('(6) renders the today card + history list + streak indicator when auth is true', () => {
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
      items: [makeHistoryItem()],
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

    expect(
      container.querySelector('[data-testid="daily-challenge-page-live"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-streak-indicator"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-history-list"]'),
    ).not.toBeNull()
  })

  it('(7) calls loadMore when the history View All button is clicked', () => {
    const loadMore = vi.fn()
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
        makeHistoryItem({ id: '2026-08-01T00:00:00.000Z-quiz-1' }),
        makeHistoryItem({
          id: '2026-07-31T00:00:00.000Z-quiz-2',
          date: '2026-07-31T00:00:00.000Z',
          quizId: 'quiz-2',
          score: 70,
          rank: 9,
        }),
        makeHistoryItem({
          id: '2026-07-30T00:00:00.000Z-quiz-3',
          date: '2026-07-30T00:00:00.000Z',
          quizId: 'quiz-3',
          score: 60,
          rank: 12,
          isTopTen: false,
        }),
        makeHistoryItem({
          id: '2026-07-29T00:00:00.000Z-quiz-4',
          date: '2026-07-29T00:00:00.000Z',
          quizId: 'quiz-4',
          score: 55,
          rank: 18,
          isTopTen: false,
        }),
      ],
      isLoading: false,
      isLoadingMore: false,
      hasMore: true,
      loadMore,
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

    render(<DailyChallengePage flagValue='v1' />)

    // The list truncates to 3 items before showing "View All" so
    // there must be more than 3 for the button to appear.
    const button = screen.getByRole('button', { name: /Load 1 more past challenges/i })
    fireEvent.click(button)

    expect(loadMore).toHaveBeenCalledTimes(1)
  })

  it('(8) does NOT render the streak indicator when isAuthenticated is false', () => {
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

    expect(
      container.querySelector('[data-testid="daily-challenge-streak-indicator"]'),
    ).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// (9) + (10) error branches
// ---------------------------------------------------------------------------

describe('DailyChallengePage — error branches', () => {
  it('(9) renders a 5xx alert copy and does NOT render the today card', () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: null,
      isLoading: false,
      error: makeApiError(500),
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

    expect(
      container.querySelector('[data-testid="daily-challenge-page-error"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).toBeNull()
  })

  it('(10) renders the graceful-degradation history alert above the today card', () => {
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
      error: makeApiError(503),
      isMissingEndpoint: false,
      refresh: async () => {},
      retryBannerVisible: false,
      mutate: async () => {},
    })

    const { container } = render(<DailyChallengePage flagValue='v1' />)

    expect(
      container.querySelector('[data-testid="daily-challenge-history-error"]'),
    ).not.toBeNull()
    // The today card is unaffected by a history error.
    expect(
      container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
  })
})

// ---------------------------------------------------------------------------
// (11) play surface — pending + authenticated
// ---------------------------------------------------------------------------

describe('DailyChallengePage — play surface', () => {
  it('(11) mounts the play surface when status is "pending" and the viewer is authenticated', () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: makeChallenge({ status: 'pending', scorePercent: null, rank: null }),
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

    const { container } = render(<DailyChallengePage flagValue='v1' />)

    expect(
      container.querySelector('[data-testid="daily-challenge-play-surface"]'),
    ).not.toBeNull()
    // The card's CTA branch must be the in-place affordance, NOT the
    // sign-in link.
    expect(
      container.querySelector('[data-testid="daily-challenge-card-cta"]'),
    ).not.toBeNull()
    expect(
      container.querySelector('[data-testid="daily-challenge-card-signin"]'),
    ).toBeNull()
  })

  it('(11b) does NOT mount the play surface when status is "completed"', () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: makeChallenge({ status: 'completed', scorePercent: 80, rank: 5 }),
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

    const { container } = render(<DailyChallengePage flagValue='v1' />)

    expect(
      container.querySelector('[data-testid="daily-challenge-play-surface"]'),
    ).toBeNull()
    // The card renders the completed recap line instead.
    expect(
      container.querySelector('[data-testid="daily-challenge-card-completed"]'),
    ).not.toBeNull()
  })

  it('(11c) does NOT mount the play surface when the viewer is unauthenticated', () => {
    useDailyChallengeTodayMock.mockReturnValue({
      challenge: makeChallenge({ status: 'pending', scorePercent: null, rank: null }),
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

    expect(
      container.querySelector('[data-testid="daily-challenge-play-surface"]'),
    ).toBeNull()
    // The card renders the sign-in CTA instead.
    expect(
      container.querySelector('[data-testid="daily-challenge-card-signin"]'),
    ).not.toBeNull()
  })
})
