

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'

import { ApiError } from '@/lib/api'

import { DailyChallengePage } from '@/features/daily-challenge/components/DailyChallengePage'
import type { DailyChallengeView } from '@/features/daily-challenge/types/dto'
import type { DailyChallengeHistoryItemWithId } from '@/features/daily-challenge/hooks/useDailyChallengeHistory'

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

describe('DailyChallengePage — placeholder', () => {
it('(1) renders the placeholder when the flag is "placeholder"', () => {
useDailyChallengeStreakViewMock.mockReturnValue({
streak: 0,
isAuthenticated: true,
    })

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

expect(
container.querySelector('[data-testid="daily-challenge-card"]'),
    ).toBeNull()
  })

it('(2) renders the placeholder when the "today" hook reports isMissingEndpoint', () => {

const { container } = render(<DailyChallengePage flagValue='v1' />)
expect(
container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
  })

it('(3) renders the empty-state branch (NOT the placeholder) when history is empty but today resolves', () => {

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

expect(
container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
expect(
container.querySelector('[data-testid="daily-challenge-history-empty-state"]'),
    ).not.toBeNull()
  })
})

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

expect(
container.querySelector('[data-testid="daily-challenge-history-empty-state"]'),
    ).not.toBeNull()
  })
})

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

expect(
container.querySelector('[data-testid="daily-challenge-card"]'),
    ).not.toBeNull()
  })
})

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

expect(
container.querySelector('[data-testid="daily-challenge-card-signin"]'),
    ).not.toBeNull()
  })
})
