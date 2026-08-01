/**
 * `QuizHeader.spec.tsx` — locks the C1 component contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C1.
 *
 * Five cases per the ticket AC #1–5:
 *
 *   (C1 AC #1) Cover has explicit dimensions/aspect ratio and
 *   meaningful alt text; missing cover uses a fallback without
 *   layout shift.
 *   (C1 AC #2) The title is the page's single `h1`.
 *   (C1 AC #3) A confirmed category reference renders a link to
 *   `/categories/<id>`; no category renders no row.
 *   (C1 AC #4) Tags render as clickable `TagPill`s in backend
 *   order; no tags render no wrapper.
 *   (C1 AC #5) No author, stats, CTA, question, or related-query
 *   logic is embedded.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up. The component is imported
 * from `@/features/quizzes` via its public barrel — never directly
 * from the components folder, mirroring the rule for hooks.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import { QuizHeader } from '@/features/quizzes/components/QuizHeader';
import type { PlayerQuizDetail } from '@/features/quizzes/lib/quiz-player-view';
import type { QuizTagDto } from '@/lib/api/generated/schemas/quizTagDto';

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

function makeTag(tagId: string, name: string): QuizTagDto {
  return { tagId, name, slug: name.toLowerCase().replace(/\s+/g, '-') };
}

function makeQuiz(
  overrides: Partial<PlayerQuizDetail> = {},
): PlayerQuizDetail {
  return {
    quizId: '0192f4d8-1111-7000-8000-000000000001',
    creatorId: null,
    title: 'A friendly quiz',
    description: 'A short description.',
    slug: 'a-friendly-quiz',
    requirements: null,
    imageUrl: null,
    categoryId: null,
    isFeatured: false,
    isHidden: false,
    isVerified: false,
    publishedVersionId: null,
    publishedVersion: null,
    tags: [],
    createdAt: '2026-07-01T00:00:00.000Z',
    updatedAt: '2026-07-01T00:00:00.000Z',
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
});

describe('QuizHeader — cover', () => {
  it('(C1 AC #1) renders an alt-tagged image with explicit aspect ratio when cover is present', () => {
    render(
      <QuizHeader
        quiz={makeQuiz({
          title: 'Geography Trivia',
          imageUrl: 'https://example.test/cover.jpg',
        })}
      />,
    );

    const img = screen.getByRole('img', {
      name: /cover image for geography trivia/i,
    });
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'https://example.test/cover.jpg');

    // The wrapper carries the explicit aspect ratio so layout
    // dimensions are reserved even before the image loads.
    const wrapper = img.parentElement;
    expect(wrapper?.className).toMatch(/aspect-\[4\/3\]/);
  });

  it('(C1 AC #1) renders the deterministic initials fallback without an <img> when cover is missing', () => {
    render(
      <QuizHeader
        quiz={makeQuiz({
          title: 'Geography Trivia',
          imageUrl: null,
        })}
      />,
    );

    // No <img> for the cover.
    expect(
      screen.queryByRole('img', {
        name: /cover image for geography trivia/i,
      }),
    ).toBeNull();

    // The initials of the first two words are rendered.
    expect(screen.getByText('GT')).toBeInTheDocument();

    // The wrapper still carries the aspect ratio so the page
    // does not shift when a cover is later added.
    const fallback = screen.getByText('GT');
    const wrapper = fallback.parentElement;
    expect(wrapper?.className).toMatch(/aspect-\[4\/3\]/);
  });
});

describe('QuizHeader — title', () => {
  it('(C1 AC #2) renders the quiz title as the single h1', () => {
    render(
      <QuizHeader quiz={makeQuiz({ title: 'A friendly quiz' })} />,
    );

    const headings = screen.getAllByRole('heading', { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent('A friendly quiz');
  });
});

describe('QuizHeader — category', () => {
  it('(C1 AC #3) renders a category link to /categories/<id> when categoryId is set', () => {
    render(
      <QuizHeader
        quiz={makeQuiz({ categoryId: 'cat-123' })}
      />,
    );

    const link = screen.getByTestId('quiz-header-category');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/categories/cat-123');
    expect(link).toHaveAttribute('data-category-id', 'cat-123');
  });

  it('(C1 AC #3) renders no category link when categoryId is null', () => {
    render(<QuizHeader quiz={makeQuiz({ categoryId: null })} />);

    expect(screen.queryByTestId('quiz-header-category')).toBeNull();
  });
});

describe('QuizHeader — tags', () => {
  it('(C1 AC #4) renders tags as clickable pills in backend order', () => {
    const tags = [
      makeTag('0192f4d8-aaaa-7000-8000-000000000001', 'Science'),
      makeTag('0192f4d8-bbbb-7000-8000-000000000002', 'History'),
      makeTag('0192f4d8-cccc-7000-8000-000000000003', 'Geography'),
    ];

    render(<QuizHeader quiz={makeQuiz({ tags })} />);

    const wrapper = screen.getByTestId('quiz-header-tags');
    expect(wrapper).toBeInTheDocument();

    // Pills render in the supplied backend order — the second
    // pill (History) sits between Science and Geography.
    const pills = wrapper.querySelectorAll('[data-testid="tag-pill"]');
    expect(pills).toHaveLength(3);
    expect(pills[0]).toHaveAttribute('data-tag-id', tags[0].tagId);
    expect(pills[1]).toHaveAttribute('data-tag-id', tags[1].tagId);
    expect(pills[2]).toHaveAttribute('data-tag-id', tags[2].tagId);
    expect(pills[0]).toHaveAttribute('data-variant', 'clickable');
  });

  it('(C1 AC #4) renders no tags wrapper when tags are empty', () => {
    render(<QuizHeader quiz={makeQuiz({ tags: [] })} />);

    expect(screen.queryByTestId('quiz-header-tags')).toBeNull();
    expect(
      screen.queryAllByTestId('tag-pill'),
    ).toHaveLength(0);
  });
});

describe('QuizHeader — non-goals', () => {
  it('(C1 AC #5) does not embed byline, stats, CTA, question, or related-query affordances', () => {
    render(
      <QuizHeader
        quiz={makeQuiz({
          tags: [makeTag('0192f4d8-aaaa-7000-8000-000000000001', 'Science')],
        })}
      />,
    );

    // No "Start attempt" / "Bookmark" / "Share" CTAs.
    expect(screen.queryByRole('button', { name: /start/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /bookmark/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /share/i })).toBeNull();

    // No question/answer-option rendering.
    expect(
      screen.queryByRole('list', { name: /questions/i }),
    ).toBeNull();

    // No stats row — C3 owns that section.
    expect(screen.queryByTestId('quiz-metadata-row')).toBeNull();
  });
});
