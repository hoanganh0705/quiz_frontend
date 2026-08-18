import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import { ApiError } from '@/lib/api';
import type { PlayerQuizDetail } from '@/features/quizzes/lib/quiz-player-view';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const {
detailHookMock,
statsHookMock,
bookmarkHookMock,
relatedHookMock,
notFoundMock,
detailRetry,
statsRetry,
} = vi.hoisted(() => ({
detailHookMock: vi.fn(),
statsHookMock: vi.fn(),
bookmarkHookMock: vi.fn(),
relatedHookMock: vi.fn(),
notFoundMock: vi.fn(),
detailRetry: vi.fn(),
statsRetry: vi.fn(),
}));

vi.mock('next/link', () => ({
default: ({
href,
children,
...rest
  }: React.AnchorHTMLAttributes<HTMLAnchorElement> & {
href: string;
children: React.ReactNode;
  }) => (
<a href={href} {...rest}>
{children}
</a>
  ),
}));

vi.mock('next/navigation', () => ({ notFound: notFoundMock }));
vi.mock('@/features/quizzes/hooks/useQuizByIdOrSlug', () => ({
useQuizByIdOrSlug: detailHookMock,
}));
vi.mock('@/features/quizzes/hooks/useQuizStatsByIdOrSlug', () => ({
useQuizStatsByIdOrSlug: statsHookMock,
}));
vi.mock('@/features/quizzes/hooks/useIsBookmarked', () => ({
useIsBookmarked: bookmarkHookMock,
}));
vi.mock('@/features/quizzes/hooks/useQuizRelated', () => ({

QUIZ_RELATED_LIMIT: 4,
useQuizRelated: relatedHookMock,
}));

vi.mock('@/features/auth/hooks/use-auth-session', () => ({
useAuthSession: () => ({
bootstrapState: 'unauthenticated',
isAuthenticated: false,
currentUser: null,
user: null,
error: null,
profileError: null,
refetch: vi.fn(),
clearBootstrap: vi.fn(),
isBootstrapping: false,
isDegraded: false,
  }),
}));

vi.mock('@/features/reviews/hooks/useQuizReviews', () => ({
useQuizReviews: () => ({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
reviews: [],
  }),
}));

vi.mock('@/features/reviews/hooks/useMyQuizReview', () => ({
useMyQuizReview: () => ({
review: null,
isLoading: false,
hasResolved: true,
error: null,
retry: vi.fn(),
  }),
}));

vi.mock('@/features/comments/hooks/useQuizComments', () => ({
useQuizComments: () => ({
items: [],
isLoading: false,
isLoadingMore: false,
hasMore: false,
loadMore: vi.fn(),
error: null,
refresh: vi.fn(),
  }),
}));
vi.mock('@/features/comments/hooks/useCreateComment', () => ({
useCreateComment: () => ({
createComment: vi.fn(),
isLoading: false,
error: null,
errorCopy: null,
lastOutcome: null,
reset: vi.fn(),
  }),
}));
vi.mock('@/features/comments/hooks/useEditComment', () => ({
useEditComment: () => ({
editComment: vi.fn(),
isLoading: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
  }),
}));
vi.mock('@/features/comments/hooks/useDeleteComment', () => ({
useDeleteComment: () => ({
deleteComment: vi.fn(),
isLoading: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
  }),
}));
vi.mock('@/features/comments/hooks/useVoteComment', () => ({
useVoteComment: () => ({
upvote: vi.fn(),
downvote: vi.fn(),
isLoading: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
  }),
}));
vi.mock('@/features/comments/hooks/useReportComment', () => ({
useReportComment: () => ({
reportComment: vi.fn(),
isLoading: false,
error: null,
lastOutcome: null,
reset: vi.fn(),
  }),
}));
vi.mock('@/features/comments/stores/useCommentThreadLookup', () => ({
useCommentThreadLookup: () => ({
incrementReplyCount: vi.fn(),
decrementReplyCount: vi.fn(),
reset: vi.fn(),
getReplyCount: () => 0,
  }),
}));

import { QuizDetailPage } from '@/features/quizzes/components/QuizDetailPage';

function makeQuiz(
overrides: Partial<PlayerQuizDetail> = {},
): PlayerQuizDetail {
return {
quizId: 'quiz-1',
creatorId: null,
title: 'Player-safe science quiz',
description: 'D'.repeat(340),
slug: 'player-safe-science',
requirements: null,
imageUrl: null,
categoryId: null,
isFeatured: false,
isHidden: false,
isVerified: true,
publishedVersionId: 'version-1',
publishedVersion: {
quizVersionId: 'version-1',
versionNumber: 3,
difficulty: 'medium',
durationMs: 900_000,
passingScorePercent: 70,
rewardXp: 50,
questions: [
{
questionId: 'question-1',
quizVersionId: 'version-1',
position: 1,
questionText: 'First question',
imageUrl: null,
answerOptions: [
{
optionId: 'option-1',
position: 1,
value: 'First option',
createdAt: '2026-07-01T00:00:00.000Z',
            },
          ],
        },
{
questionId: 'question-2',
quizVersionId: 'version-1',
position: 2,
questionText: 'Second question',
imageUrl: null,
answerOptions: [],
        },
      ],
    },
tags: [],
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
...overrides,
  };
}

function makeStats(
overrides: Partial<QuizStatsResponseDto> = {},
): QuizStatsResponseDto {
return {
quizId: 'quiz-1',
totalAttempts: 24,
uniquePlayers: 18,
averageScore: 76.5,
averageRating: 4.4,
bookmarkCount: 8,
completionRate: 87.5,
popularityScore: 65.2,
trendingScore: 11.3,
...overrides,
  };
}

function resolvedDetail(quiz: PlayerQuizDetail | null = makeQuiz()) {
return {
quiz,
notFound: false,
isLoading: false,
error: null,
retry: detailRetry,
isRetrying: false,
  };
}

function resolvedStats(stats: QuizStatsResponseDto | null = makeStats()) {
return {
stats,
isLoading: false,
noStats: false,
error: null,
retry: statsRetry,
isRetrying: false,
  };
}

function makeRelatedItem(index: number) {
return {
quizId: `0192f4d8-0000-7000-8000-${String(index).padStart(12, '0')}`,
creatorId: null,
title: `Related Quiz ${index}`,
description: null,
slug: `related-quiz-${index}`,
requirements: null,
imageUrl: null,
categoryId: null,
isFeatured: false,
isHidden: false,
isVerified: false,
publishedVersionId: null,
createdAt: '2026-07-01T00:00:00.000Z',
updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function resolvedRelated() {
return {
items: [makeRelatedItem(1), makeRelatedItem(2), makeRelatedItem(3), makeRelatedItem(4)],
isLoading: false,
error: null,
notFound: false,
  };
}

beforeEach(() => {
detailRetry.mockReset();
statsRetry.mockReset();
notFoundMock.mockReset();
detailHookMock.mockReturnValue(resolvedDetail());
statsHookMock.mockReturnValue(resolvedStats());
bookmarkHookMock.mockReturnValue({ isBookmarked: false, isLoading: false });

relatedHookMock.mockReturnValue(resolvedRelated());
});

afterEach(() => cleanup());

describe('QuizDetailPage — primary lifecycle', () => {
it('renders the full player-safe composition in the approved order', () => {
const { container } = render(<QuizDetailPage idOrSlug='player-safe-science' />);

expect(detailHookMock).toHaveBeenCalledWith('player-safe-science');
expect(statsHookMock).toHaveBeenCalledWith('player-safe-science');
expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
'Player-safe science quiz',
    );
expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1);
expect(screen.getByTestId('quiz-byline')).toHaveTextContent('Anonymous');
expect(screen.getByTestId('quiz-metadata-row')).toBeInTheDocument();
expect(screen.getByTestId('quiz-description')).toBeInTheDocument();
expect(screen.getAllByTestId('quiz-question-card')).toHaveLength(2);
expect(screen.getByTestId('quiz-stats-panel')).toBeInTheDocument();
expect(screen.getByTestId('quiz-cta-strip')).toBeInTheDocument();

expect(screen.getByTestId('quiz-related-quizzes')).toBeInTheDocument();

expect(relatedHookMock).toHaveBeenCalledWith('player-safe-science');

const ordered = [
screen.getByTestId('quiz-header'),
screen.getByTestId('quiz-byline'),
screen.getByTestId('quiz-metadata-row'),
screen.getByTestId('quiz-description'),
screen.getByTestId('quiz-question-list'),
screen.getByTestId('quiz-stats-panel'),
screen.getByTestId('quiz-cta-strip'),
screen.getByTestId('quiz-related-quizzes'),
    ];
ordered.slice(1).forEach((node, index) => {
expect(
ordered[index].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    });

expect(container.innerHTML).not.toContain('isCorrect');
expect(container.querySelector('a[href*="/start"]')).toBeNull();
  });

it('uses the full-page skeleton only during primary detail loading', () => {
detailHookMock.mockReturnValue({
...resolvedDetail(null),
isLoading: true,
    });
statsHookMock.mockReturnValue({ ...resolvedStats(null), isLoading: true });

render(<QuizDetailPage idOrSlug='quiz-1' />);

expect(screen.getByTestId('quiz-detail-page-skeleton')).toBeInTheDocument();
expect(screen.queryByTestId('quiz-detail-page')).not.toBeInTheDocument();
  });

it('delegates primary 404 state to the route NotFound mechanism', () => {
notFoundMock.mockImplementation(() => {
throw new Error('NEXT_NOT_FOUND');
    });
detailHookMock.mockReturnValue({
...resolvedDetail(null),
notFound: true,
    });

expect(() => render(<QuizDetailPage idOrSlug='missing' />)).toThrow(
'NEXT_NOT_FOUND',
    );
expect(notFoundMock).toHaveBeenCalled();
  });

it('renders a toast-style primary alert and retries only the detail hook', () => {
detailHookMock.mockReturnValue({
...resolvedDetail(null),
error: { status: 503 },
    });

render(<QuizDetailPage idOrSlug='quiz-1' />);

const alert = screen.getByRole('alert');
expect(alert).toHaveTextContent("We couldn't load this quiz");
fireEvent.click(within(alert).getByRole('button', { name: 'Retry' }));
expect(detailRetry).toHaveBeenCalledTimes(1);
expect(statsRetry).not.toHaveBeenCalled();
  });
});

describe('QuizDetailPage — independent stats lifecycle', () => {
it('keeps detail content visible while stats load and preserves metadata dimensions', () => {
statsHookMock.mockReturnValue({ ...resolvedStats(null), isLoading: true });

render(<QuizDetailPage idOrSlug='quiz-1' />);

expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
expect(screen.getByTestId('quiz-question-list')).toBeInTheDocument();
expect(screen.getByTestId('quiz-stats-panel-skeleton')).toBeInTheDocument();
expect(screen.getByLabelText('Loading average rating')).toHaveClass('h-4', 'w-6');
expect(screen.getByLabelText('Loading attempt count')).toHaveClass('h-4', 'w-6');
  });

it('maps stats 404 to zeros without removing the detail', () => {
statsHookMock.mockReturnValue({
...resolvedStats(null),
noStats: true,
    });

render(<QuizDetailPage idOrSlug='quiz-1' />);

expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
expect(screen.getByTestId('quiz-stats-empty-caption')).toHaveTextContent(
'Data will populate as people play',
    );
  });

it('isolates stats 5xx and retries only stats', () => {
statsHookMock.mockReturnValue({
...resolvedStats(null),
error: { status: 503 },
    });

render(<QuizDetailPage idOrSlug='quiz-1' />);

expect(screen.getByRole('heading', { level: 1 })).toBeVisible();
expect(screen.getByTestId('quiz-question-list')).toBeInTheDocument();
fireEvent.click(screen.getByTestId('quiz-stats-retry'));
expect(statsRetry).toHaveBeenCalledTimes(1);
expect(detailRetry).not.toHaveBeenCalled();
  });

it('renders the prepared state for a projected empty question list', () => {
detailHookMock.mockReturnValue(
resolvedDetail(
makeQuiz({
publishedVersion: {
...makeQuiz().publishedVersion!,
questions: [],
          },
        }),
      ),
    );

render(<QuizDetailPage idOrSlug='quiz-1' />);

expect(screen.getByText('Quiz is being prepared')).toBeInTheDocument();
expect(screen.getByRole('link', { name: /contact support/i })).toHaveAttribute(
'href',
'mailto:support@quizhub.com',
    );
  });
});

describe('QuizDetailPage — related block (Story 3.8 / TKT-3.8.F1)', () => {

it('renders the heading + 4 QuizCards below the stats panel when related items resolve', () => {

render(<QuizDetailPage idOrSlug='player-safe-science' />);

const related = screen.getByTestId('quiz-related-quizzes');
expect(
within(related).getByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeInTheDocument();
expect(within(related).getAllByTestId('quiz-card')).toHaveLength(4);

const cards = within(related).getAllByTestId('quiz-card');
expect(cards.map((card) => card.getAttribute('aria-label'))).toEqual([
'Related Quiz 1',
'Related Quiz 2',
'Related Quiz 3',
'Related Quiz 4',
    ]);

const statsPanel = screen.getByTestId('quiz-stats-panel');
expect(
statsPanel.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

expect(relatedHookMock).toHaveBeenCalledWith('player-safe-science');
  });

it('hides the related block entirely when useQuizRelated returns items=[]', () => {
relatedHookMock.mockReturnValue({
items: [],
isLoading: false,
error: null,
notFound: false,
    });

render(<QuizDetailPage idOrSlug='player-safe-science' />);

expect(screen.queryByTestId('quiz-related-quizzes')).toBeNull();
expect(
screen.queryByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeNull();
  });

it('hides the related block entirely when useQuizRelated returns notFound=true', () => {
relatedHookMock.mockReturnValue({
items: [],
isLoading: false,
error: null,
notFound: true,
    });

render(<QuizDetailPage idOrSlug='player-safe-science' />);

expect(screen.queryByTestId('quiz-related-quizzes')).toBeNull();
expect(
screen.queryByRole('heading', { level: 2, name: 'Related quizzes' }),
    ).toBeNull();
  });

it('hides the related block entirely when useQuizRelated returns an ApiError', () => {
const apiError = new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'Internal',
code: 'GLOBAL_INTERNAL_ERROR',
config: undefined,
request: undefined,
response: {
status: 500,
data: { code: 'GLOBAL_INTERNAL_ERROR', detail: 'fixture' },
      },
toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError.fromAxios>[0]);

relatedHookMock.mockReturnValue({
items: [],
isLoading: false,
error: apiError,
notFound: false,
    });

render(<QuizDetailPage idOrSlug='player-safe-science' />);

expect(screen.queryByTestId('quiz-related-quizzes')).toBeNull();

expect(screen.queryByRole('alert')).toBeNull();
  });

it('does NOT call console.error / console.warn for any related-block outcome', () => {
const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

const outcomes: Array<Parameters<typeof relatedHookMock.mockReturnValue>[0]> = [
resolvedRelated(),
{ items: [], isLoading: false, error: null, notFound: false },
{ items: [], isLoading: false, error: null, notFound: true },
{
items: [],
isLoading: false,
error: new ApiError({
isAxiosError: true,
name: 'AxiosError',
message: 'X',
code: 'X',
config: undefined,
request: undefined,
response: { status: 500, data: { code: 'X' } },
toJSON: () => ({}),
        } as unknown as Parameters<typeof ApiError.fromAxios>[0]),
notFound: false,
      },
    ];

for (const outcome of outcomes) {
relatedHookMock.mockReturnValue(outcome);
const { unmount } = render(<QuizDetailPage idOrSlug='quiz-cycle' />);
unmount();
    }

expect(errorSpy).not.toHaveBeenCalled();
expect(warnSpy).not.toHaveBeenCalled();

errorSpy.mockRestore();
warnSpy.mockRestore();
  });
});
