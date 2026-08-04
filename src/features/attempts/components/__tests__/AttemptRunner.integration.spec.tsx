/**
 * `AttemptRunner.integration.spec.tsx` — thin integration suite for
 * the Story 4.14 attempt lifecycle.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.32.
 *
 * This suite complements the focused per-hook / per-component
 * specs by exercising the most important **cross-cutting**
 * invariants the active runner must hold end-to-end. It is
 * intentionally small and dependency-light so the feedback loop
 * stays fast — the heavier lifecycle tests live in the per-hook
 * specs.
 *
 * Coverage:
 *
 *   - The runner source itself never imports Story 4.15 completion,
 *     review, analytics, or any correctness metadata.
 *   - The runner re-exports the canonical public API surface
 *     (`AttemptRunner`, `AttemptRunnerPage`, `useAttemptRunner`)
 *     from the feature barrel.
 *   - The route layout/page mount paths exist for the
 *     `/quizzes/[idOrSlug]/attempt` route.
 *   - The legacy `/quizzes/[idOrSlug]/start` redirects to the
 *     canonical route (verified statically via the route source).
 *   - The CTA strip delegates the cross-tab aware Start/Continue
 *     flow to the active-attempt hook.
 */

import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';

const FEATURE_DIR =
  '/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/attempts';
const COMPONENTS_DIR = `${FEATURE_DIR}/components`;
const HOOKS_DIR = `${FEATURE_DIR}/hooks`;
const APP_DIR =
  '/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/app';

const FORBIDDEN_AUTH_REVIEW_OR_SCORE = [
  /completeAttempt\(/,
  /attemptControllerCompleteAttempt/,
  /\bisCorrect\b/,
  /\bcorrectAnswer\b/,
  /\bcorrectOptionId\b/,
  /\bscorePercent\b/,
  /\bgetAttemptReview\b/,
  /\bgetAttemptAnalytics\b/,
];

function readSource(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('AttemptRunner — integration: player-DTO + 4.15 reservation', () => {
  it('AttemptRunner.tsx source never imports forbidden surface', () => {
    const src = readSource(`${COMPONENTS_DIR}/AttemptRunner.tsx`);
    for (const pattern of FORBIDDEN_AUTH_REVIEW_OR_SCORE) {
      expect(src).not.toMatch(pattern);
    }
  });

  it('AttemptRunnerPage.tsx source never imports forbidden surface', () => {
    const src = readSource(`${COMPONENTS_DIR}/AttemptRunnerPage.tsx`);
    for (const pattern of FORBIDDEN_AUTH_REVIEW_OR_SCORE) {
      expect(src).not.toMatch(pattern);
    }
  });

  it('useAttemptRunner.ts source never imports forbidden surface', () => {
    const src = readSource(`${HOOKS_DIR}/useAttemptRunner.ts`);
    for (const pattern of FORBIDDEN_AUTH_REVIEW_OR_SCORE) {
      expect(src).not.toMatch(pattern);
    }
  });
});

describe('AttemptRunner — integration: feature barrel', () => {
  it('the feature barrel re-exports the runner hook and the runner page', () => {
    const barrel = readSource(`${FEATURE_DIR}/index.ts`);
    expect(barrel).toMatch(/useAttemptRunner|export[\s\S]*useAttemptRunner/);
    expect(barrel).toMatch(/AttemptRunnerPage/);
  });

  it('the components barrel exports the runner UI primitives', () => {
    const barrel = readSource(`${COMPONENTS_DIR}/index.ts`);
    for (const name of [
      'AttemptRunner',
      'AttemptRunnerPage',
      'AttemptStartCta',
      'AttemptContinueCta',
      'AttemptHeader',
      'AttemptQuestionCard',
      'AttemptAnswerPicker',
      'AttemptProgressBar',
      'AttemptAbandonDialog',
    ]) {
      expect(barrel).toContain(name);
    }
  });
});

describe('AttemptRunner — integration: canonical route mounted', () => {
  it('the protected /attempt route page mounts AttemptRunnerPage', () => {
    const page = readSource(
      `${APP_DIR}/(protected)/quizzes/[idOrSlug]/attempt/page.tsx`,
    );
    expect(page).toMatch(/AttemptRunnerPage/);
  });

  it('the legacy /start route redirects to the canonical /attempt route', () => {
    const startPage = readSource(
      `${APP_DIR}/(public)/quizzes/[idOrSlug]/start/page.tsx`,
    );
    // The redirect either calls `redirect()` or returns a Next
    // `permanentRedirect`. Either way the source must reference
    // the canonical attempt path.
    expect(startPage).toMatch(/\/attempt/);
  });
});

describe('AttemptRunner — integration: CTA delegation', () => {
  it('the QuizCtaStrip delegates Start/Continue to the active-attempt hook', () => {
    const strip = readSource(
      '/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/quizzes/components/QuizCtaStrip.tsx',
    );
    expect(strip).toMatch(/useActiveAttempt/);
    expect(strip).toMatch(/AttemptStartCta|AttemptContinueCta/);
  });
});
