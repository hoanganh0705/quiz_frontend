

import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ApiError } from '@/lib/api';

import { useUserAchievementHistory } from '../../hooks/useUserAchievementHistory';

import { UserAchievementHistoryPanel } from '../UserAchievementHistoryPanel';

vi.mock('../../hooks/useUserAchievementHistory', () => ({
useUserAchievementHistory: vi.fn(),
}));

const USER_ID = '00000000-0000-4000-8000-000000000001';

const HISTORY_FIXTURE = [
{
userBadgeId: 'ub-1',
badgeId: 'badge-1',
badgeName: 'Badge One',
badgeType: 'quiz',
earnedAt: '2025-01-01T00:00:00Z',
isActive: true,
revokedAt: null,
revocationReason: null,
  },
{
userBadgeId: 'ub-2',
badgeId: 'badge-2',
badgeName: 'Badge Two',
badgeType: 'quiz',
earnedAt: '2025-02-01T00:00:00Z',
isActive: false,
revokedAt: '2025-03-01T00:00:00Z',
revocationReason: 'Test revoke',
  },
];

function makeApiError(code: string, requestId = 'req-1'): ApiError {
return new ApiError({
isAxiosError: true,
response: {
status: 500,
data: {
status: 500,
detail: code,
title: code,
extensions: { code, requestId },
      },
    },
name: 'AxiosError',
message: code,
  });
}

beforeEach(() => {
vi.mocked(useUserAchievementHistory).mockReset();
});
afterEach(() => vi.restoreAllMocks());

describe('TKT-7.8.D4 — UserAchievementHistoryPanel', () => {
it('AC #1 — loading renders skeleton', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: [],
hasMore: false,
isLoading: true,
isLoadingMore: false,
error: null,
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(
screen.getByTestId('history-panel-loading'),
    ).toBeInTheDocument();
expect(screen.getAllByTestId('history-skeleton-row')).toHaveLength(5);
  });

it('AC #5 — error renders error notice', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: [],
hasMore: false,
isLoading: false,
isLoadingMore: false,
error: makeApiError('ACHIEVEMENT_NOT_FOUND'),
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(screen.getByTestId('history-panel-error')).toBeInTheDocument();
expect(screen.getByTestId('history-error-notice')).toBeInTheDocument();
  });

it('AC #3 — empty history renders empty state', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: [],
hasMore: false,
isLoading: false,
isLoadingMore: false,
error: null,
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(screen.getByTestId('history-panel-empty')).toBeInTheDocument();
expect(screen.getByTestId('history-empty-state')).toHaveTextContent(
'This user has no badge history yet.',
    );
  });

it('AC #2 — success renders history list', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: HISTORY_FIXTURE,
hasMore: false,
isLoading: false,
isLoadingMore: false,
error: null,
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(screen.getByTestId('history-panel')).toBeInTheDocument();
expect(screen.getAllByTestId('history-item')).toHaveLength(2);
expect(screen.getByText('Badge One')).toBeInTheDocument();
  });

it('AC #2 — Load more button renders when hasMore is true', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: HISTORY_FIXTURE,
hasMore: true,
isLoading: false,
isLoadingMore: false,
error: null,
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(screen.getByTestId('history-load-more')).toBeInTheDocument();
  });

it('AC #4 — rateLimitedUntil hides Load more and renders notice', () => {
const loadMore = vi.fn();
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: HISTORY_FIXTURE,
hasMore: true,
isLoading: false,
isLoadingMore: false,
error: null,
rateLimitedUntil: '2025-08-07T12:00:00.000Z',
loadMore,
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(
screen.queryByTestId('history-load-more'),
    ).not.toBeInTheDocument();
expect(
screen.getByTestId('history-rate-limit-notice'),
    ).toBeInTheDocument();
expect(loadMore).not.toHaveBeenCalled();
  });

it('revoked items show Revoked label', () => {
vi.mocked(useUserAchievementHistory).mockReturnValue({
history: HISTORY_FIXTURE,
hasMore: false,
isLoading: false,
isLoadingMore: false,
error: null,
rateLimitedUntil: null,
loadMore: vi.fn(),
mutate: vi.fn(),
    });

render(<UserAchievementHistoryPanel userId={USER_ID} />);

expect(screen.getAllByText('Revoked')).toHaveLength(1);
  });
});
