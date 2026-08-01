/**
 * axe-core a11y audits for the `QuizDetailPage` composition.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.G2.
 *
 * Runs a structural axe-core audit against three required states:
 *   - Resolved (detail + stats resolved).
 *   - Loading (primary detail still in flight — full-page skeleton).
 *   - No-stats (detail resolved, stats 404 mapped to the zero panel).
 *
 * The audit rule set is the project-wide structural subset used by
 * all other axe specs in this codebase. Color contrast is verified
 * manually because jsdom does not implement HTMLCanvasElement.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import axe from 'axe-core';

import type { PlayerQuizDetail } from '@/features/quizzes/lib/quiz-player-view';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

const {
  detailHookMock,
  statsHookMock,
  bookmarkHookMock,
  detailRetry,
  statsRetry,
} = vi.hoisted(() => ({
  detailHookMock: vi.fn(),
  statsHookMock: vi.fn(),
  bookmarkHookMock: vi.fn(),
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

function makeQuiz(): PlayerQuizDetail {
  return {
    quizId: 'quiz-1',
    creatorId: null,
    title: 'Player-safe science quiz',
    description: null,
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
      ],
    },
    tags: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
  };
}

function makeStats(): QuizStatsResponseDto {
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
  };
}

const STRUCTURAL_RULES = [
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
];

async function audit() {
  return axe.run(document.body, {
    runOnly: { type: 'rule', values: STRUCTURAL_RULES },
  });
}

function blockersOnly(
  results: Awaited<ReturnType<typeof audit>>,
) {
  return results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious',
  );
}

beforeEach(() => {
  detailRetry.mockReset();
  statsRetry.mockReset();
  detailHookMock.mockReturnValue({
    quiz: makeQuiz(),
    notFound: false,
    isLoading: false,
    error: null,
    retry: detailRetry,
    isRetrying: false,
  });
  statsHookMock.mockReturnValue({
    stats: makeStats(),
    isLoading: false,
    noStats: false,
    error: null,
    retry: statsRetry,
    isRetrying: false,
  });
  bookmarkHookMock.mockReturnValue({ isBookmarked: false, isLoading: false });
});

afterEach(() => cleanup());

describe('QuizDetailPage — axe a11y audit', () => {
  it('resolved composition: no critical or serious violations', async () => {
    const { container, unmount } = render(<QuizDetailPage idOrSlug='quiz-1' />);
    document.body.appendChild(container);
    const results = await audit();
    unmount();
    document.body.innerHTML = '';

    const blockers = blockersOnly(results);
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
  });

  it('loading state (primary detail still in flight): no critical or serious violations', async () => {
    detailHookMock.mockReturnValue({
      quiz: null,
      notFound: false,
      isLoading: true,
      error: null,
      retry: detailRetry,
      isRetrying: false,
    });
    statsHookMock.mockReturnValue({
      stats: null,
      isLoading: true,
      noStats: false,
      error: null,
      retry: statsRetry,
      isRetrying: false,
    });

    const { container, unmount } = render(<QuizDetailPage idOrSlug='quiz-1' />);
    document.body.appendChild(container);
    const results = await audit();
    unmount();
    document.body.innerHTML = '';

    const blockers = blockersOnly(results);
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
  });

  it('no-stats state (stats 404 mapped to zeros): no critical or serious violations', async () => {
    statsHookMock.mockReturnValue({
      stats: null,
      isLoading: false,
      noStats: true,
      error: null,
      retry: statsRetry,
      isRetrying: false,
    });

    const { container, unmount } = render(<QuizDetailPage idOrSlug='quiz-1' />);
    document.body.appendChild(container);
    const results = await audit();
    unmount();
    document.body.innerHTML = '';

    const blockers = blockersOnly(results);
    expect(blockers, JSON.stringify(blockers, null, 2)).toHaveLength(0);
  });
});
