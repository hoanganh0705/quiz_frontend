/**
 * `AttemptRunner.player-dto.spec.tsx` — Story 4.14 player-DTO and
 * no-spoiler boundary coverage.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.30.
 *
 * This spec is the focused boundary test that proves the active
 * runner consumes player-safe DTOs only and never exposes author /
 * review / analytics correctness. The per-component specs already
 * assert the same invariant inside their own fixtures — this spec
 * verifies the *aggregate* promise at the runner-orchestrator level
 * and adds a static-import gate so a future regression that
 * accidentally pulls an author DTO into the runner fails this
 * suite first.
 */

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const FEATURE_DIR =
  '/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/attempts';

const HOOKS_DIR = `${FEATURE_DIR}/hooks`;
const COMPONENTS_DIR = `${FEATURE_DIR}/components`;

const FORBIDDEN_AUTHOR_IMPORTS = [
  // Author-view DTO surfaces (must not enter the runner)
  'QuizQuestionAuthor',
  'QuizAnswerOptionAuthor',
  'QuizAuthor',
  // Authoring action services
  'attemptControllerEditQuestion',
  'attemptControllerAddOption',
  // Attempt-review / analytics surfaces (Story 4.15 + later)
  'getAttemptReview',
  'getAttemptAnalytics',
  'getAttemptReviewById',
  // Legacy mock answer-key fields
  'correctAnswer',
  'correctOptionId',
  'correctOptionIds',
  'optionIsCorrect',
];

function readSource(file: string): string {
  return readFileSync(file, 'utf8');
}

describe('AttemptRunner — static no-spoiler boundary', () => {
  it('the runner orchestrator never imports forbidden author DTOs', () => {
    const src = readSource(`${HOOKS_DIR}/useAttemptRunner.ts`);
    for (const forbidden of FORBIDDEN_AUTHOR_IMPORTS) {
      expect(src).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
    }
  });

  it('the runner UI never imports forbidden author DTOs', () => {
    const candidates = ['AttemptRunner.tsx', 'AttemptRunnerPage.tsx'];
    for (const file of candidates) {
      const src = readSource(`${COMPONENTS_DIR}/${file}`);
      for (const forbidden of FORBIDDEN_AUTHOR_IMPORTS) {
        expect(src).not.toMatch(new RegExp(`\\b${forbidden}\\b`));
      }
    }
  });

  it('the answer picker never imports author-side field identifiers', () => {
    const src = readSource(`${COMPONENTS_DIR}/AttemptAnswerPicker.tsx`);
    expect(src).not.toMatch(/\bisCorrect\b/);
    expect(src).not.toMatch(/correctAnswer|correctOptionId|correctOptionIds/);
  });

  it('the question card never references correctness data in its rendered output contract', () => {
    const src = readSource(`${COMPONENTS_DIR}/AttemptQuestionCard.tsx`);
    expect(src).not.toMatch(/\bisCorrect\b/);
    expect(src).not.toMatch(/correctAnswer/);
  });

  it('the runner feature never imports attempts service analytics / review', () => {
    // Both the active-attempt lookup (T-4.14.5) and the hydration
    // hook (T-4.14.6) are gated to the player reading path; they
    // must not chain to review / analytics endpoints.
    const useActive = readSource(`${HOOKS_DIR}/useActiveAttempt.ts`);
    const useHydration = readSource(`${HOOKS_DIR}/useAttemptHydration.ts`);
    expect(useActive).not.toMatch(/getAttemptReview|getAttemptAnalytics/);
    expect(useHydration).not.toMatch(/getAttemptReview|getAttemptAnalytics/);
  });
});

describe('AttemptRunner — invariant: no score / result UI in 4.14', () => {
  it('the runner source does not render any score surface', () => {
    const candidates = [
      `${COMPONENTS_DIR}/AttemptRunner.tsx`,
      `${COMPONENTS_DIR}/AttemptQuestionCard.tsx`,
      `${COMPONENTS_DIR}/AttemptAnswerPicker.tsx`,
      `${COMPONENTS_DIR}/AttemptHeader.tsx`,
      `${COMPONENTS_DIR}/AttemptProgressBar.tsx`,
    ];
    for (const f of candidates) {
      const src = readSource(f);
      // Story 4.14 never renders a score / percentage / result block.
      expect(src).not.toMatch(/>\s*score\s*</i);
      expect(src).not.toMatch(/score\s*=\s*{/);
    }
  });
});
