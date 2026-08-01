import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import type { PlayerQuizDetail } from '@/features/quizzes/lib/quiz-player-view';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const {
  detailHookMock,
  statsHookMock,
  bookmarkHookMock,
  notFoundMock,
  detailRetry,
  statsRetry,
} = vi.hoisted(() => ({
  detailHookMock: vi.fn(),
  statsHookMock: vi.fn(),
  bookmarkHookMock: vi.fn(),
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

beforeEach(() => {
  detailRetry.mockReset();
  statsRetry.mockReset();
  notFoundMock.mockReset();
  detailHookMock.mockReturnValue(resolvedDetail());
  statsHookMock.mockReturnValue(resolvedStats());
  bookmarkHookMock.mockReturnValue({ isBookmarked: false, isLoading: false });
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
    expect(screen.getByTestId('quiz-related-quizzes-slot')).toBeInTheDocument();

    const ordered = [
      screen.getByTestId('quiz-header'),
      screen.getByTestId('quiz-byline'),
      screen.getByTestId('quiz-metadata-row'),
      screen.getByTestId('quiz-description'),
      screen.getByTestId('quiz-question-list'),
      screen.getByTestId('quiz-stats-panel'),
      screen.getByTestId('quiz-cta-strip'),
      screen.getByTestId('quiz-related-quizzes-slot'),
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
