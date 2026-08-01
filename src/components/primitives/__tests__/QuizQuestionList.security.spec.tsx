/**
 * `QuizQuestionList.security.spec.tsx` — defense-in-depth regression
 * suite for the no-spoiler invariant.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.D3.
 *
 * Locks the no-`isCorrect` invariant at three layers:
 *
 *   1. The A3 projection strips every `isCorrect` key on
 *      options and emits a `captureException` event tagged with
 *      the player-detail surface and the leak reason.
 *   2. `<QuizQuestionCard>` cannot accept any correctness data
 *      because its prop type is the A3 player-safe type.
 *   3. The full rendered subtree of `<QuizQuestionList>` (which
 *      composes `<QuizQuestionCard>`) contains no correctness
 *      key, value, label, class name, or accessible name.
 *
 * The test feeds a deliberately broken raw payload through the
 * A3 projection, then composes the components over the resulting
 * player-safe shape. The "safe payload" control case asserts no
 * telemetry is emitted on a normal payload.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';

import { QuizQuestionList } from '@/features/quizzes/components/QuizQuestionList';
import {
  type PlayerQuestion,
  projectQuizToPlayerView,
} from '@/features/quizzes/lib/quiz-player-view';

const { captureExceptionSpy } = vi.hoisted(() => ({
  captureExceptionSpy: vi.fn(),
}));

vi.mock('@/lib/observability/sentry-capture', async () => {
  const actual = await vi.importActual<
    typeof import('@/lib/observability/sentry-capture')
  >('@/lib/observability/sentry-capture');
  return {
    ...actual,
    captureException: captureExceptionSpy,
  };
});

interface MaliciousOption {
  optionId: string;
  position: number;
  value: string;
  createdAt: string;
  isCorrect: boolean;
}

interface MaliciousQuestion {
  questionId: string;
  quizVersionId: string;
  position: number;
  questionText: string;
  imageUrl: null;
  createdAt: string;
  updatedAt: string;
  answerOptions: MaliciousOption[];
}

interface MaliciousPublishedVersion {
  quizVersionId: string;
  versionNumber: number;
  difficulty: 'easy';
  durationMs: number;
  passingScorePercent: number;
  rewardXp: number;
  questions: MaliciousQuestion[];
}

interface MaliciousQuiz {
  quizId: string;
  creatorId: null;
  title: string;
  description: null;
  slug: string;
  requirements: null;
  imageUrl: null;
  categoryId: null;
  isFeatured: boolean;
  isHidden: boolean;
  isVerified: boolean;
  publishedVersionId: string;
  createdAt: string;
  updatedAt: string;
  publishedVersion: MaliciousPublishedVersion;
  tags: never[];
}

function makeMaliciousQuiz(): MaliciousQuiz {
  return {
    quizId: 'quiz-leak-1',
    creatorId: null,
    title: 'Leaky Quiz',
    description: null,
    slug: 'leaky-quiz',
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: 'ver-1',
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    publishedVersion: {
      quizVersionId: 'ver-1',
      versionNumber: 1,
      difficulty: 'easy',
      durationMs: 60_000,
      passingScorePercent: 70,
      rewardXp: 50,
      questions: [
        {
          questionId: 'q-1',
          quizVersionId: 'ver-1',
          position: 1,
          questionText: 'What is 1+1?',
          imageUrl: null,
          createdAt: '2026-07-01T00:00:00.000Z',
          updatedAt: '2026-07-01T00:00:00.000Z',
          answerOptions: [
            {
              optionId: 'opt-1',
              position: 1,
              value: '1',
              createdAt: '2026-07-01T00:00:00.000Z',
              isCorrect: false,
            },
            {
              optionId: 'opt-2',
              position: 2,
              value: '2',
              createdAt: '2026-07-01T00:00:00.000Z',
              isCorrect: true,
            },
          ],
        },
      ],
    },
    tags: [],
  };
}

function makeSafeQuiz(): MaliciousQuiz {
  // Same shape, but every option omits `isCorrect` — the
  // player-view payload the contract promises.
  const safe = JSON.parse(JSON.stringify(makeMaliciousQuiz())) as MaliciousQuiz;
  for (const question of safe.publishedVersion.questions) {
    for (const option of question.answerOptions) {
      delete (option as { isCorrect?: boolean }).isCorrect;
    }
  }
  return safe;
}

beforeEach(() => {
  captureExceptionSpy.mockReset();
  captureExceptionSpy.mockImplementation(() => undefined);
});

afterEach(() => {
  cleanup();
});

describe('Defense in depth — no correctness leak through to the DOM', () => {
  it('(D3 AC #1, #2) leaks are stripped and telemetry is emitted for every corrupted option', () => {
    const malicious = makeMaliciousQuiz();

    // The malicious quiz type-cast at the boundary because
    // the runtime payload carries the forbidden key. The A3
    // projection is the only place that consumes this shape.
    const projected = projectQuizToPlayerView(
      malicious as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );

    // Two options carried `isCorrect`; the projection emits
    // one captureException call per corrupted option.
    expect(captureExceptionSpy).toHaveBeenCalledTimes(2);

    // Every call carries the expected tags + the quiz ID.
    for (const call of captureExceptionSpy.mock.calls) {
      const [, context] = call as [
        unknown,
        {
          tags: { surface: string; reason: string };
          contexts: { quizId: string; optionId: string };
        },
      ];
      expect(context.tags.surface).toBe('useQuizByIdOrSlug');
      expect(context.tags.reason).toBe('isCorrect-leak');
      expect(context.contexts.quizId).toBe('quiz-leak-1');
      expect(context.contexts.optionId).toMatch(/^opt-/);
    }

    // The projected shape carries no `isCorrect` reference.
    const projectedJson = JSON.stringify(projected);
    expect(projectedJson).not.toContain('isCorrect');

    // Compose the components over the projected shape and
    // assert the full rendered subtree is also leak-free.
    const questions = projected.publishedVersion?.questions ?? [];
    expect(questions.length).toBeGreaterThan(0);
    const firstQuestion: PlayerQuestion | undefined = questions[0];
    expect(firstQuestion).toBeDefined();

    const { container } = render(
      <QuizQuestionList questions={firstQuestion ? [firstQuestion] : []} />,
    );

    const html = container.innerHTML;
    expect(html).not.toContain('isCorrect');
    expect(html).not.toContain('iscorrect');
    expect(html.toLowerCase()).not.toContain('is-correct');
    expect(html.toLowerCase()).not.toContain('correct');

    // The visible option values are intact.
    expect(html).toContain('1');
    expect(html).toContain('2');
  });

  it('(D3 AC #4) emits no observability event for a normal safe payload', () => {
    const safe = makeSafeQuiz();

    const projected = projectQuizToPlayerView(
      safe as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );

    expect(captureExceptionSpy).not.toHaveBeenCalled();

    // The projected payload also contains no `isCorrect` key.
    expect(JSON.stringify(projected)).not.toContain('isCorrect');
  });
});

describe('Defense in depth — DOM surface audit', () => {
  it('(D3 AC #3) renders no correctness key/value in container.innerHTML, visible text, attributes, or accessible names', () => {
    const malicious = makeMaliciousQuiz();
    const projected = projectQuizToPlayerView(
      malicious as unknown as Parameters<typeof projectQuizToPlayerView>[0],
    );
    const questions = projected.publishedVersion?.questions ?? [];

    const { container } = render(
      <QuizQuestionList
        questions={questions.length > 0 ? questions : []}
      />,
    );

    // container.innerHTML
    const html = container.innerHTML;
    expect(html).not.toContain('isCorrect');

    // Visible text
    expect(container.textContent ?? '').not.toMatch(/isCorrect/i);
    expect(container.textContent ?? '').not.toMatch(/correct/i);

    // Every attribute on every element
    const allElements = container.querySelectorAll('*');
    allElements.forEach((el) => {
      for (const attr of Array.from(el.attributes)) {
        expect(attr.value).not.toMatch(/isCorrect/i);
        expect(attr.value.toLowerCase()).not.toMatch(/correct/);
        expect(attr.name.toLowerCase()).not.toMatch(/correct/);
      }
    });

    // Accessible names — collect every aria-label / label /
    // alt, then assert none contain a forbidden token.
    const labelled = container.querySelectorAll(
      '[aria-label], [aria-labelledby], [alt], label',
    );
    labelled.forEach((el) => {
      const labelText =
        el.getAttribute('aria-label') ??
        el.getAttribute('alt') ??
        el.textContent ??
        '';
      expect(labelText).not.toMatch(/isCorrect/i);
      expect(labelText.toLowerCase()).not.toMatch(/correct/);
    });

    // Sanity — the sentry module was reached (we mocked it,
    // so the mock spy is what proves the call happened).
    expect(captureExceptionSpy).toHaveBeenCalled();
  });
});
