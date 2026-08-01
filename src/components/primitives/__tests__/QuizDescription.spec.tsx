/**
 * `QuizDescription.spec.tsx` — locks the C4 component contract.
 *
 * Source epic:   Epic 3.6 — Quiz detail (player view) + stats.
 * Source ticket: TKT-3.6.C4.
 *
 * Six cases per the ticket AC #1–6:
 *
 *   (C4 AC #1) Markdown formatting renders through the approved
 *   shared renderer or a minimal sanitized equivalent.
 *   (C4 AC #2) Script tags, event-handler attributes,
 *   `javascript:` URLs, raw unsafe HTML, and unsafe image URLs
 *   do not execute or survive as dangerous DOM attributes.
 *   (C4 AC #3) Descriptions of 300 characters or fewer render
 *   without an expander.
 *   (C4 AC #4) Longer descriptions render a collapsed preview
 *   and an accessible `Read more`/`Show less` control with
 *   `aria-expanded`.
 *   (C4 AC #5) Expanding does not move content above the
 *   description; the expanded text occupies normal flow.
 *   (C4 AC #6) Null/empty description omits the section cleanly.
 *
 * The file lives under `src/components/primitives/__tests__/` so
 * vitest's `jsdom` project picks it up.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import { QuizDescription } from '@/features/quizzes/components/QuizDescription';

afterEach(() => {
  cleanup();
});

describe('QuizDescription — rendering', () => {
  it('(C4 AC #1) renders headings, paragraphs, and lists from safe markdown', () => {
    const md = [
      '## What this quiz is about',
      '',
      'A short paragraph that introduces the topic.',
      '',
      '- First bullet',
      '- Second bullet',
    ].join('\n');

    render(<QuizDescription description={md} />);

    expect(
      screen.getByRole('heading', { level: 2, name: /what this quiz is about/i }),
    ).toBeInTheDocument();

    expect(screen.getByText(/short paragraph/i)).toBeInTheDocument();

    expect(screen.getByRole('list')).toBeInTheDocument();
    expect(screen.getByText(/first bullet/i)).toBeInTheDocument();
    expect(screen.getByText(/second bullet/i)).toBeInTheDocument();
  });

  it('(C4 AC #2) does not surface script tags or event handlers in the DOM', () => {
    const md = [
      '## Topic',
      '',
      '<script>window.__xssFired = true</script>',
      '',
      '<img src="x" onerror="window.__xssFired = true" />',
      '',
      '[click](javascript:alert(1))',
    ].join('\n');

    const { container } = render(<QuizDescription description={md} />);

    // No <script> tags rendered into the description subtree.
    expect(container.querySelectorAll('script').length).toBe(0);
    // No `onerror` attribute anywhere in the rendered HTML.
    expect(container.innerHTML).not.toContain('onerror');
    // The javascript: URL was dropped; the label survives as
    // plain text without an anchor pointing at it.
    expect(container.querySelector('a[href*="javascript:"]')).toBeNull();
    expect(container.innerHTML).not.toContain('javascript:');
    // The global side-effect marker must never have been set.
    expect((globalThis as { __xssFired?: boolean }).__xssFired).toBeUndefined();
  });

  it('(C4 AC #2) does not render unsafe image URLs', () => {
    const md = '![alt](data:text/html,<script>alert(1)</script>)';
    const { container } = render(<QuizDescription description={md} />);
    expect(container.querySelector('img')).toBeNull();
    expect(container.innerHTML).not.toContain('data:');
    expect(container.innerHTML).not.toContain('<script');
  });
});

describe('QuizDescription — expansion', () => {
  it('(C4 AC #3) renders no expander when the description is 300 characters or fewer', () => {
    const md = 'x'.repeat(300);
    render(<QuizDescription description={md} />);

    expect(screen.queryByTestId('quiz-description-toggle')).toBeNull();

    const section = screen.getByTestId('quiz-description');
    expect(section).toHaveAttribute('data-long', 'false');
    expect(section).toHaveAttribute('data-expanded', 'false');
  });

  it('(C4 AC #4) renders a collapsed preview and the "Read more" toggle when the description is longer than 300 characters', () => {
    const md = [
      '## Long description',
      '',
      'A'.repeat(350),
    ].join('\n');

    render(<QuizDescription description={md} />);

    const toggle = screen.getByTestId('quiz-description-toggle');
    expect(toggle).toBeInTheDocument();
    expect(toggle).toHaveTextContent(/read more/i);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');

    // The body reports it is currently truncated.
    const body = screen.getByTestId('quiz-description-body');
    expect(body).toHaveAttribute('data-truncated', 'true');

    // The toggle's aria-controls points at the body.
    const bodyId = body.getAttribute('id');
    expect(bodyId).toBeTruthy();
    expect(toggle).toHaveAttribute('aria-controls', bodyId ?? '');
  });

  it('(C4 AC #4, #5) toggles to "Show less" and exposes the full body after activation', () => {
    const md = 'B'.repeat(350);

    render(<QuizDescription description={md} />);

    const toggle = screen.getByTestId('quiz-description-toggle');
    expect(toggle).toHaveTextContent(/read more/i);

    fireEvent.click(toggle);

    expect(toggle).toHaveTextContent(/show less/i);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');

    const body = screen.getByTestId('quiz-description-body');
    expect(body).toHaveAttribute('data-truncated', 'false');
  });

  it('(C4 AC #5) does not overlay or focus-jump when expanded — the body stays in normal flow', () => {
    const md = 'C'.repeat(350);

    const { container } = render(<QuizDescription description={md} />);

    const bodyBefore = screen.getByTestId('quiz-description-body');
    const topBefore = bodyBefore.getBoundingClientRect().top;

    fireEvent.click(screen.getByTestId('quiz-description-toggle'));

    // The body still occupies its own block — it is not a portal,
    // tooltip, or popover. We assert no `position: absolute` or
    // `position: fixed` is applied to the body itself.
    const bodyAfter = screen.getByTestId('quiz-description-body');
    const styleAttr = bodyAfter.getAttribute('style') ?? '';
    expect(styleAttr).not.toMatch(/position\s*:\s*(absolute|fixed)/);

    // The section still lives inside its container (no teleport).
    const section = screen.getByTestId('quiz-description');
    expect(container.contains(section)).toBe(true);

    // Sanity: the body remained visible (we did not move it off
    // the page). top can change between the two states because
    // the body grows; we assert it did not become negative
    // (i.e. did not move above the page).
    const topAfter = bodyAfter.getBoundingClientRect().top;
    expect(topAfter).toBeGreaterThanOrEqual(0);
    expect(topBefore).toBeGreaterThanOrEqual(0);
  });
});

describe('QuizDescription — empty / null', () => {
  it('(C4 AC #6) omits the section entirely when description is null', () => {
    const { container } = render(<QuizDescription description={null} />);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByTestId('quiz-description')).toBeNull();
  });

  it('(C4 AC #6) omits the section entirely when description is empty / whitespace', () => {
    const { container: c1 } = render(<QuizDescription description="" />);
    expect(c1.firstChild).toBeNull();

    cleanup();

    const { container: c2 } = render(<QuizDescription description="   " />);
    expect(c2.firstChild).toBeNull();
  });
});
