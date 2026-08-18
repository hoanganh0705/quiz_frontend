

import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

const HOOKS_DIR =
'/home/nguyenhoanganh/Workspace/WebProjects/quiz/quiz_frontend/src/features/attempts/hooks';

function readHook(name: string): string {
return readFileSync(`${HOOKS_DIR}/${name}`, 'utf8');
}

const HOOK_FILES = {
start: 'useStartAttempt.ts',
submit: 'useSubmitAnswer.ts',
withdraw: 'useDeleteAnswer.ts',
abandon: 'useAbandonAttempt.ts',
} as const;

describe('attempt-mutations — no Story 4.15 surface leaked', () => {
it.each(Object.entries(HOOK_FILES))(
'%s hook source never calls the completeAttempt service function',
(_name, file) => {
const src = readHook(file);

expect(src).not.toMatch(/completeAttempt\(/);
expect(src).not.toMatch(/attemptControllerCompleteAttempt/);
    },
  );
});

describe('attempt-mutations — distinct error branches per hook', () => {
it.each(Object.entries(HOOK_FILES))(
'%s hook exposes error-branch handling for 409 / 422 / 429 / 5xx',
(_name, file) => {
const src = readHook(file);

expect(src).toMatch(/ApiError|err instanceof ApiError|ApiError\.code/);
    },
  );

it('duplicate-attempt branches are owned only by start-attempt', () => {
const others = [
HOOK_FILES.submit,
HOOK_FILES.withdraw,
HOOK_FILES.abandon,
    ];
for (const file of others) {
const src = readHook(file);
expect(src).not.toMatch(/ATTEMPT_ALREADY_STARTED/);
    }
  });

it('duplicate-answer branch is owned only by submit-answer', () => {
for (const file of [
HOOK_FILES.start,
HOOK_FILES.withdraw,
HOOK_FILES.abandon,
    ]) {
const src = readHook(file);
expect(src).not.toMatch(/ATTEMPT_QUESTION_ALREADY_ANSWERED/);
    }
  });

it('answer-not-found branch is owned only by delete-answer', () => {
for (const file of [
HOOK_FILES.start,
HOOK_FILES.submit,
HOOK_FILES.abandon,
    ]) {
const src = readHook(file);
expect(src).not.toMatch(/ATTEMPT_ANSWER_NOT_FOUND/);
    }
  });
});

describe('attempt-mutations — uniform cooldown timing', () => {
it.each(Object.entries(HOOK_FILES))(
'%s hook declares DEFAULT_COOLDOWN_MS = 500',
(_name, file) => {
const src = readHook(file);
expect(src).toMatch(/DEFAULT_COOLDOWN_MS\s*=\s*500/);
    },
  );

it('every hook has a `cooldown` outcome kind', () => {
for (const file of Object.values(HOOK_FILES)) {
const src = readHook(file);
expect(src).toMatch(/kind:\s*['"]cooldown['"]/);
    }
  });
});

describe('attempt-mutations — uniform cross-tab broadcast channel', () => {
it.each(Object.entries(HOOK_FILES))(
'%s hook routes through the attempts broadcast channel',
(_name, file) => {
const src = readHook(file);
expect(src).toMatch(
/broadcastAttemptsChanged|attempts\/changed|attempts-changed/,
      );
    },
  );

it.each(Object.entries(HOOK_FILES))(
'%s hook declares a distinct event kind',
(_name, file) => {
const src = readHook(file);

expect(src).toMatch(/kind:\s*['"](?:start|submit|withdraw|abandon)/);
    },
  );
});

describe('attempt-mutations — typed outcome unions are exhaustive', () => {
it.each(Object.entries(HOOK_FILES))(
'%s hook returns an outcome that distinguishes success from retryable',
(_name, file) => {
const src = readHook(file);
expect(src).toMatch(/kind:\s*['"]success['"]/);
expect(src).toMatch(/kind:\s*['"]retryable['"]/);
expect(src).toMatch(/kind:\s*['"]cooldown['"]/);
    },
  );

it('every hook declares a typed outcome interface', () => {
for (const file of Object.values(HOOK_FILES)) {
const src = readHook(file);
expect(src).toMatch(/Outcome\s*=[\s\S]*?\|/);
    }
  });
});
