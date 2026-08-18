

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const FEATURE_DIR =
'/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/attempts';

const HOOKS_DIR = `${FEATURE_DIR}/hooks`;
const COMPONENTS_DIR = `${FEATURE_DIR}/components`;

const FORBIDDEN_AUTHOR_IMPORTS = [

'QuizQuestionAuthor',
'QuizAnswerOptionAuthor',
'QuizAuthor',

'attemptControllerEditQuestion',
'attemptControllerAddOption',

'getAttemptReview',
'getAttemptAnalytics',
'getAttemptReviewById',

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

expect(src).not.toMatch(/>\s*score\s*</i);
expect(src).not.toMatch(/score\s*=\s*{/);
    }
  });
});
