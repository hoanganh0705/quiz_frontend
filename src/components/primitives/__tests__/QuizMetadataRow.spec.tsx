/**
 * `QuizMetadataRow.spec.tsx` — locks the C3 metadata row contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C3.
 *
 * Five cases per the ticket AC #1–5:
 *
 *   (C3 AC #1) Difficulty, player-safe question count, and
 *   formatted duration derive from the published version.
 *   (C3 AC #2) Average rating and attempt count use the exact
 *   confirmed stats fields; while stats are unavailable, their
 *   reserved cells render neutral placeholders without changing
 *   dimensions.
 *   (C3 AC #3) Zero is displayed as zero, not treated as missing.
 *   (C3 AC #4) Layout wraps at narrow widths without horizontal
 *   overflow.
 *   (C3 AC #5) Icons are decorative and labels remain available
 *   to assistive technology.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { QuizMetadataRow } from '@/features/quizzes/components/QuizMetadataRow';
import type { PlayerQuestion, PlayerQuizDetail } from '@/features/quizzes/lib/quiz-player-view';
import type { QuizStatsResponseDto } from '@/lib/api/generated/schemas/quizStatsResponseDto';

function makeQuestion(position: number, id: string): PlayerQuestion {
  return {
    questionId: id,
    quizVersionId: 'ver-1',
    position,
    questionText: `Q${position}`,
    imageUrl: null,
    answerOptions: [],
  };
}

function makeQuiz(
  overrides: Partial<PlayerQuizDetail> = {},
): PlayerQuizDetail {
  return {
    quizId: '0192f4d8-1111-7000-8000-000000000001',
    creatorId: null,
    title: 'Sample quiz',
    description: null,
    slug: 'sample-quiz',
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: 'ver-1',
    publishedVersion: {
      quizVersionId: 'ver-1',
      versionNumber: 1,
      difficulty: 'medium',
      durationMs: 600_000,
      passingScorePercent: 70,
      rewardXp: 50,
      questions: [],
    },
    tags: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

function makeStats(overrides: Partial<QuizStatsResponseDto> = {}): QuizStatsResponseDto {
  return {
    quizId: '0192f4d8-1111-7000-8000-000000000001',
    totalAttempts: 12,
    uniquePlayers: 7,
    averageScore: 73.5,
    averageRating: 4.2,
    bookmarkCount: 3,
    completionRate: 80,
    popularityScore: 91.0,
    trendingScore: 12.4,
    commentsCount: 5,
    recentActivity: [],
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('QuizMetadataRow — published-version-derived cells', () => {
  it('(C3 AC #1) renders difficulty, question count, and duration from the published version', () => {
    const quiz = makeQuiz({
      publishedVersion: {
        quizVersionId: 'ver-1',
        versionNumber: 1,
        difficulty: 'hard',
        durationMs: 1_500_000, // 25 minutes
        passingScorePercent: 70,
        rewardXp: 50,
        questions: [
          makeQuestion(1, 'q1'),
          makeQuestion(2, 'q2'),
          makeQuestion(3, 'q3'),
        ],
      },
    });

    render(<QuizMetadataRow quiz={quiz} stats={makeStats()} />);

    // Difficulty is title-cased for display.
    expect(
      screen.getByTestId('quiz-metadata-difficulty'),
    ).toHaveTextContent('Hard');

    // Question count uses the A3 normalized question list.
    expect(
      screen.getByTestId('quiz-metadata-question-count'),
    ).toHaveTextContent('3');

    // Duration is formatted from durationMs.
    expect(
      screen.getByTestId('quiz-metadata-duration'),
    ).toHaveTextContent('25m');
  });

  it('(C3 AC #1) renders a friendly duration at the 1h boundary', () => {
    const quiz = makeQuiz({
      publishedVersion: {
        ...makeQuiz().publishedVersion!,
        durationMs: 3_600_000, // exactly 1h
      },
    });

    render(<QuizMetadataRow quiz={quiz} stats={makeStats()} />);
    expect(screen.getByTestId('quiz-metadata-duration')).toHaveTextContent('1h');
  });

  it('(C3 AC #1) renders the hour-and-minute composite form', () => {
    const quiz = makeQuiz({
      publishedVersion: {
        ...makeQuiz().publishedVersion!,
        durationMs: 5_400_000, // 1h 30m
      },
    });

    render(<QuizMetadataRow quiz={quiz} stats={makeStats()} />);
    expect(screen.getByTestId('quiz-metadata-duration')).toHaveTextContent('1h 30m');
  });
});

describe('QuizMetadataRow — stats-derived cells', () => {
  it('(C3 AC #2) renders average rating and attempt count from the stats fields', () => {
    const quiz = makeQuiz();
    const stats = makeStats({ averageRating: 4.7, totalAttempts: 123 });

    render(<QuizMetadataRow quiz={quiz} stats={stats} />);

    expect(screen.getByTestId('quiz-metadata-rating')).toHaveTextContent('4.7');
    expect(screen.getByTestId('quiz-metadata-attempts')).toHaveTextContent('123');
  });

  it('(C3 AC #2) renders neutral placeholders while stats are loading', () => {
    const quiz = makeQuiz();

    render(
      <QuizMetadataRow quiz={quiz} stats={null} isStatsLoading />,
    );

    const ratingCell = screen.getByTestId('quiz-metadata-rating');
    const attemptsCell = screen.getByTestId('quiz-metadata-attempts');

    // The placeholders are reachable, have a loading data-state,
    // and an aria-label so screen readers announce "Loading …".
    expect(
      within(ratingCell).getByLabelText(/loading average rating/i),
    ).toHaveAttribute('data-state', 'loading');
    expect(
      within(attemptsCell).getByLabelText(/loading attempt count/i),
    ).toHaveAttribute('data-state', 'loading');

    // Row dimensions are stable because the placeholders are
    // fixed-height inline blocks (h-4 w-6).
    const ratingPlaceholder = within(ratingCell).getByLabelText(
      /loading average rating/i,
    );
    const attemptsPlaceholder = within(attemptsCell).getByLabelText(
      /loading attempt count/i,
    );
    expect(ratingPlaceholder.className).toMatch(/h-4/);
    expect(ratingPlaceholder.className).toMatch(/w-6/);
    expect(attemptsPlaceholder.className).toMatch(/h-4/);
    expect(attemptsPlaceholder.className).toMatch(/w-6/);
  });

  it('(C3 AC #2) renders dash placeholders when stats are settled null', () => {
    const quiz = makeQuiz();

    render(
      <QuizMetadataRow
        quiz={quiz}
        stats={null}
        isStatsLoading={false}
      />,
    );

    // Settled null means the hook already returned a 404 or
    // noStats. We render a dash so the cell stays dimensionally
    // stable without inventing metrics.
    const ratingCell = screen.getByTestId('quiz-metadata-rating');
    const attemptsCell = screen.getByTestId('quiz-metadata-attempts');
    expect(ratingCell).toHaveTextContent('—');
    expect(attemptsCell).toHaveTextContent('—');
  });
});

describe('QuizMetadataRow — zero is zero', () => {
  it('(C3 AC #3) renders a stats totalAttempts of 0 as the literal "0"', () => {
    const quiz = makeQuiz();
    const stats = makeStats({ totalAttempts: 0, averageRating: 0 });

    render(<QuizMetadataRow quiz={quiz} stats={stats} />);

    const ratingCell = screen.getByTestId('quiz-metadata-rating');
    const attemptsCell = screen.getByTestId('quiz-metadata-attempts');

    expect(ratingCell).toHaveTextContent('0.0');
    expect(attemptsCell).toHaveTextContent('0');
  });
});

describe('QuizMetadataRow — empty published version', () => {
  it('renders safe defaults when no published version is present', () => {
    const quiz = makeQuiz({ publishedVersion: null });

    render(<QuizMetadataRow quiz={quiz} stats={null} />);

    expect(
      screen.getByTestId('quiz-metadata-difficulty'),
    ).toHaveTextContent('—');
    expect(
      screen.getByTestId('quiz-metadata-question-count'),
    ).toHaveTextContent('0');
    expect(
      screen.getByTestId('quiz-metadata-duration'),
    ).toHaveTextContent('—');
  });
});

describe('QuizMetadataRow — layout', () => {
  it('(C3 AC #4) wraps at narrow widths without horizontal overflow', () => {
    const quiz = makeQuiz();
    render(<QuizMetadataRow quiz={quiz} stats={makeStats()} />);

    const row = screen.getByTestId('quiz-metadata-row');
    expect(row.className).toMatch(/flex-wrap/);
    expect(row.className).toMatch(/overflow-x-hidden/);
  });
});

describe('QuizMetadataRow — accessibility', () => {
  it('(C3 AC #5) marks every icon as decorative and exposes accessible labels', () => {
    const quiz = makeQuiz();
    render(<QuizMetadataRow quiz={quiz} stats={makeStats()} />);

    // Five icons. Every one is decorative.
    const icons = screen.getByTestId('quiz-metadata-row').querySelectorAll('svg');
    expect(icons.length).toBeGreaterThanOrEqual(5);
    icons.forEach((icon) => {
      expect(icon.getAttribute('aria-hidden')).toBe('true');
    });

    // Each cell uses <dt className="sr-only"> for the label
    // and <dd> for the value, so screen readers announce the
    // "Difficulty: Hard" form.
    expect(
      screen.getByTestId('quiz-metadata-row').querySelectorAll('dt.sr-only')
        .length,
    ).toBeGreaterThanOrEqual(5);
  });
});

// Local re-implementation of @testing-library/react's `within`
// because it avoids pulling a second import for a single use.
function within<T extends Element>(element: T): {
  getByLabelText: (text: string | RegExp) => HTMLElement;
} {
  return {
    getByLabelText: (text) => {
      const match = Array.from(element.querySelectorAll('[aria-label]')).find(
        (el) =>
          el.getAttribute('aria-label') === text ||
          (text instanceof RegExp && text.test(el.getAttribute('aria-label') ?? '')),
      );
      if (!match) {
        throw new Error(
          `[within] No element with aria-label "${String(text)}"`,
        );
      }
      return match as HTMLElement;
    },
  };
}
