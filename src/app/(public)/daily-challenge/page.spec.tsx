

import {
afterEach,
beforeEach,
describe,
expect,
it,
vi,
} from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'

const { getFeatureFlagValueMock, isFeatureEnabledMock } = vi.hoisted(() => ({
getFeatureFlagValueMock: vi.fn(

(_flag: 'dailyChallengePage'): 'v1' | 'placeholder' => 'placeholder',
  ),
isFeatureEnabledMock: vi.fn(),
}))

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: getFeatureFlagValueMock,
isFeatureEnabled: isFeatureEnabledMock,
FEATURE_FLAGS: ['dailyChallengePage'],
}))

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

vi.resetModules()
getFeatureFlagValueMock.mockReset()
getFeatureFlagValueMock.mockReturnValue('placeholder')
setMissingEndpointDefaults()
})

afterEach(() => {
cleanup()
})

describe('Daily-challenge page boundary', () => {
it('(1) renders the placeholder when the flag resolves to "placeholder" at the route boundary', async () => {
getFeatureFlagValueMock.mockReturnValue('placeholder')

setLiveDefaults()

const Page = await loadPage()
const { container } = render(<Page />)

expect(
screen.getByRole('heading', { name: /daily challenge/i, level: 1 }),
    ).toBeInTheDocument()

expect(
container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
expect(
container.querySelector('[data-testid="daily-challenge-placeholder"]'),
    ).not.toBeNull()

expect(
container.querySelector('[data-testid="daily-challenge-card"]'),
    ).toBeNull()

expect(getFeatureFlagValueMock).toHaveBeenCalledTimes(1)
expect(getFeatureFlagValueMock).toHaveBeenCalledWith(
'dailyChallengePage',
    )
  })

it('(2) renders the placeholder when the flag is "v1" but the wrapper reports missing-endpoint', async () => {
getFeatureFlagValueMock.mockReturnValue('v1')

setMissingEndpointDefaults()

const Page = await loadPage()
const { container } = render(<Page />)

expect(
container.querySelector('[data-testid="daily-challenge-page-placeholder"]'),
    ).not.toBeNull()
  })

it('(3) renders the live surface (card + history) when the flag is "v1" AND the hooks resolve with data', async () => {
getFeatureFlagValueMock.mockReturnValue('v1')
setLiveDefaults()

const Page = await loadPage()
const { container } = render(<Page />)

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

it('(4) renders without throwing in placeholder, missing-endpoint, and live branches (never 404s)', async () => {

getFeatureFlagValueMock.mockReturnValue('placeholder')
setLiveDefaults()
{
const Page = await loadPage()
expect(() => render(<Page />)).not.toThrow()
cleanup()
    }

vi.resetModules()
getFeatureFlagValueMock.mockReset()
getFeatureFlagValueMock.mockReturnValue('v1')
setMissingEndpointDefaults()
{
const Page = await loadPage()
expect(() => render(<Page />)).not.toThrow()
cleanup()
    }

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
