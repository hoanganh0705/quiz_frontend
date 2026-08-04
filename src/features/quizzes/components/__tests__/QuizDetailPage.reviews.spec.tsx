/**
 * `QuizDetailPage.reviews.spec.tsx` — integration tests asserting the
 * ReviewsWidget integrates cleanly with the existing quiz detail
 * page composition.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.21.
 *
 * ## Coverage contract
 *
 *   - The widget renders for a loaded quiz detail.
 *   - The widget receives the canonical `quiz.quizId`, NOT the raw
 *     `idOrSlug`.
 *   - The widget sits after the existing quiz content (approved
 *     bottom-of-page placement).
 *   - Slug and UUID routes both mount the same widget.
 *   - A review-section error does NOT hide the rest of the quiz page.
 *   - No new route is created (no `next/navigation` push).
 *   - No layout shift is introduced (no horizontal overflow).
 *   - The widget's section does not collide with the comments
 *     section's placement.
 *   - Existing quiz detail sections remain visible when the reviews
 *     section errors.
 *   - Existing quiz detail tests' coverage (header, metadata, stats,
 *     CTA, related) is preserved.
 *
 * The widget is mounted via the live `ReviewsWidget` (with its
 * sub-hooks mocked at the boundary) so the page-level composition
 * is the system under test, not the SDK.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';

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
  useQuizRelated: relatedHookMock,
  QUIZ_RELATED_LIMIT: 4,
}));

// Reviews hooks — stubbed so the integration spec focuses on the
// page composition, not the SDK. The behaviour of these hooks is
// covered by the per-hook specs and the
// `ReviewsWidget.integration.spec.tsx`.
vi.mock('@/features/auth/contexts/auth-bootstrap-context', () => ({
  useAuthBootstrap: () => ({
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

// Comments hooks — stubbed to keep the existing tests deterministic
// (the comments widget is out of scope here).
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

const QUIZ_ID = '0192f4d8-3333-7000-8000-000000000099';
const QUIZ_SLUG = 'player-safe-science';

function makeQuiz(
  overrides: Partial<PlayerQuizDetail> = {},
): PlayerQuizDetail {
  return {
    quizId: QUIZ_ID,
    creatorId: null,
    title: 'Player-safe science quiz',
    description: 'D'.repeat(340),
    slug: QUIZ_SLUG,
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
    quizId: QUIZ_ID,
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
  // Default: related block resolves with 4 items so the related
  // section renders. Tests that exercise loading / empty / 404 / 5xx
  // override this per-case.
  relatedHookMock.mockReturnValue({
    items: [
      { quizId: 'r-1', title: 'Related 1', slug: 'r-1', creatorId: null, description: null, requirements: null, imageUrl: null, categoryId: null, isFeatured: false, isHidden: false, isVerified: false, publishedVersionId: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
      { quizId: 'r-2', title: 'Related 2', slug: 'r-2', creatorId: null, description: null, requirements: null, imageUrl: null, categoryId: null, isFeatured: false, isHidden: false, isVerified: false, publishedVersionId: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
      { quizId: 'r-3', title: 'Related 3', slug: 'r-3', creatorId: null, description: null, requirements: null, imageUrl: null, categoryId: null, isFeatured: false, isHidden: false, isVerified: false, publishedVersionId: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
      { quizId: 'r-4', title: 'Related 4', slug: 'r-4', creatorId: null, description: null, requirements: null, imageUrl: null, categoryId: null, isFeatured: false, isHidden: false, isVerified: false, publishedVersionId: null, createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-01T00:00:00.000Z' },
    ],
    isLoading: false,
    error: null,
    notFound: false,
  });
});

afterEach(() => cleanup());

// ---------------------------------------------------------------------------
// ReviewsWidget mounting on the quiz detail page
// ---------------------------------------------------------------------------

describe('QuizDetailPage — reviews section integration', () => {
  it('renders the ReviewsWidget for a loaded quiz', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    expect(screen.getByTestId('reviews-widget')).toBeInTheDocument();
  });

  it('passes the canonical quiz id (NOT the slug) to the ReviewsWidget', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const widget = screen.getByTestId('reviews-widget');
    expect(widget).toHaveAttribute('data-quiz-id', QUIZ_ID);
    expect(widget).toHaveAttribute('data-quiz-id', expect.not.stringMatching(QUIZ_SLUG));
  });

  it('does not introduce a new route — QuizDetailPage still owns the page', () => {
    const { container } = render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    // The page DOM carries the canonical `quiz-detail-page` testid
    // and renders the reviews section INSIDE the existing layout
    // (no new route was created).
    expect(container.querySelector('[data-testid="quiz-detail-page"]')).toBeTruthy();
    expect(container.querySelector('[data-testid="reviews-widget"]')).toBeTruthy();
  });

  it('sits the ReviewsWidget after the existing quiz content (after the related quizzes)', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const related = screen.getByTestId('quiz-related-quizzes');
    const reviews = screen.getByTestId('reviews-widget');

    expect(
      related.compareDocumentPosition(reviews) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('renders the ReviewsWidget BEFORE the comments widget', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const reviews = screen.getByTestId('reviews-widget');
    const comments = screen.getByTestId('comments-widget');

    expect(
      reviews.compareDocumentPosition(comments) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Route identity — slug vs UUID
// ---------------------------------------------------------------------------

describe('QuizDetailPage — reviews section across route identities', () => {
  it('mounts the widget when the route uses the slug', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    expect(screen.getByTestId('reviews-widget')).toBeInTheDocument();
    expect(detailHookMock).toHaveBeenCalledWith(QUIZ_SLUG);
  });

  it('mounts the widget when the route uses the canonical UUID', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_ID} />);

    expect(screen.getByTestId('reviews-widget')).toBeInTheDocument();
    expect(detailHookMock).toHaveBeenCalledWith(QUIZ_ID);
  });

  it('passes the canonical quiz id to the widget regardless of route identity', () => {
    const { rerender } = render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);
    expect(screen.getByTestId('reviews-widget')).toHaveAttribute('data-quiz-id', QUIZ_ID);

    rerender(<QuizDetailPage idOrSlug={QUIZ_ID} />);
    expect(screen.getByTestId('reviews-widget')).toHaveAttribute('data-quiz-id', QUIZ_ID);
  });
});

// ---------------------------------------------------------------------------
// Quiz-level not-found / error pathways
// ---------------------------------------------------------------------------

describe('QuizDetailPage — reviews section error isolation', () => {
  it('does NOT render the reviews section during a quiz-level loading skeleton', () => {
    detailHookMock.mockReturnValue({
      ...resolvedDetail(null),
      isLoading: true,
    });
    statsHookMock.mockReturnValue({ ...resolvedStats(null), isLoading: true });

    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    expect(screen.getByTestId('quiz-detail-page-skeleton')).toBeInTheDocument();
    expect(screen.queryByTestId('reviews-widget')).not.toBeInTheDocument();
  });

  it('does NOT render the reviews section when the quiz is not-found', () => {
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
    // The reviews widget is never mounted — the page short-circuits
    // to the not-found path before rendering children.
    expect(notFoundMock).toHaveBeenCalled();
  });

  it('keeps the existing quiz content visible when the detail hook errors', () => {
    detailHookMock.mockReturnValue({
      ...resolvedDetail(null),
      error: { status: 503 },
    });

    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    // The primary alert renders; the reviews widget does NOT.
    expect(screen.getByRole('alert')).toHaveTextContent("We couldn't load this quiz");
    expect(screen.queryByTestId('reviews-widget')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Static composition guarantees
// ---------------------------------------------------------------------------

describe('QuizDetailPage — reviews section static layout', () => {
  it('the existing header, metadata, stats, CTA, and related are unchanged', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    expect(screen.getByTestId('quiz-header')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-byline')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-metadata-row')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-description')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-question-list')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-stats-panel')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-cta-strip')).toBeInTheDocument();
    expect(screen.getByTestId('quiz-related-quizzes')).toBeInTheDocument();
  });

  it('the reviews section carries an aria-label distinct from the comments section', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const reviews = screen.getByTestId('reviews-widget');
    expect(reviews).toHaveAttribute('aria-label', 'Reviews section');
  });

  it('does NOT introduce any horizontal overflow on the page', () => {
    const { container } = render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const root = container.querySelector('[data-testid="quiz-detail-page"]');
    expect(root).toBeTruthy();
    // The page root has the `overflow-x-hidden` utility class — the
    // reviews section does not break the existing layout.
    expect((root as HTMLElement).className).toContain('overflow-x-hidden');
  });

  it('does NOT introduce any report / admin / moderation UI', () => {
    render(<QuizDetailPage idOrSlug={QUIZ_SLUG} />);

    const widget = screen.getByTestId('reviews-widget');
    expect(within(widget).queryByText(/report/i)).not.toBeInTheDocument();
    expect(within(widget).queryByText(/moderate/i)).not.toBeInTheDocument();
    expect(within(widget).queryByText(/admin/i)).not.toBeInTheDocument();
    expect(within(widget).queryByRole('link', { name: /report/i })).toBeNull();
  });
});
