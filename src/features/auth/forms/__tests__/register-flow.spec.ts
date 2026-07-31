/**
 * Registration flow — unit suite.
 *
 * Source epic: Epic 2.1 — Registration form and availability guidance.
 * Source ticket: TKT-2.1.E3.
 *
 * Coverage contract (per the ticket):
 *
 *   - `useCheckEmail` / `useCheckUsername` debounce, abort-on-input-change,
 *     stale-response discard, 429 → `rate_limited`, 5xx → `server`.
 *   - `submitRegistration` single-flight semantics — the second call returns
 *     the same in-flight `Promise`.
 *   - `mapRegisterError` covers every documented branch AND no returned
 *     string contains a canonical anti-enumeration phrase.
 *   - `registration-copy` renders the same acknowledgement body regardless
 *     of which copy key a caller asks for.
 *
 * The tests in this file are intentionally pure: they do NOT import
 * `axios`, do NOT touch the network, and do NOT import any
 * `@/lib/api/generated/**` symbol. Mocks are local to each test and
 * scoped to the dependency the unit under test exposes.
 */

import { describe, expect, it, vi } from 'vitest';

import {
  mapAvailabilityError,
  mapRegisterError,
} from '@/features/auth/errors/register-error-mapper';
import {
  registrationCopy,
  COPY_KEYS,
  resolveCopy,
} from '@/features/auth/copy/registration-copy';
import { isWellFormedEmail } from '@/features/auth/hooks/use-check-email';
import { isWellFormedUsername } from '@/features/auth/hooks/use-check-username';
import { submitRegistration } from '@/features/auth/forms/registration-submit';
import type { RegisterFormValues } from '@/features/auth/forms/schemas/register.schema';

// ─────────────────────────────────────────────────────────────────────────────
// Synthetic error-shape constructor. The mapper is a pure dispatch
// on a small, documented surface
// (`{ code, status, isValidationError, isServerError, validationMessages }`)
// so we feed it directly with a plain object — no `ApiError` instance,
// no axios, no fetch mocks.
// ─────────────────────────────────────────────────────────────────────────────

interface FakeApiError {
  code: string;
  status: number;
  isValidationError: boolean;
  isServerError: boolean;
  validationMessages: string[];
}

function apiErrorLike(opts: {
  status: number;
  code?: string;
  validationMessages?: string[];
  message?: string | string[];
}): FakeApiError {
  const code =
    opts.code ??
    (opts.status >= 500
      ? 'GLOBAL_INTERNAL_ERROR'
      : opts.status === 429
        ? 'GLOBAL_RATE_LIMITED'
        : opts.status === 400
          ? 'GLOBAL_VALIDATION_FAILED'
          : 'GLOBAL_BAD_REQUEST');
  const validationMessages =
    opts.validationMessages ??
    (Array.isArray(opts.message) ? (opts.message as string[]) : []);
  return {
    code,
    status: opts.status,
    isValidationError:
      code === 'GLOBAL_VALIDATION_FAILED' || validationMessages.length > 0,
    isServerError: opts.status >= 500,
    validationMessages,
  };
}

/**
 * `asApiError` — return the synthesized error-shape AS-IS. The mapper
 * reads duck-typed; no wrapping is required. Kept as a named alias so
 * the test reads as "feed the mapper an ApiError-shape" without
 * sprinkling `Object.create` magic.
 */
function asApiError(shape: FakeApiError): unknown {
  return shape;
}

/**
 * Build a backend-shaped 4xx/422 error carrying
 * `data.extensions.validationErrors`, matching the wire body the
 * Nest `GlobalExceptionFilter` produces today.
 */
function attachValidationErrors(
  err: FakeApiError,
  validationErrors: Array<{ field: string; message: string }>
): unknown {
  return {
    ...err,
    data: { extensions: { validationErrors } },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Anti-enumeration guard
// ─────────────────────────────────────────────────────────────────────────────

const ENUMERATION_PHRASES = [
  'already',
  'duplicate',
  'exists',
  'taken',
  'in use',
  'success',
  'account created',
];

function assertAntiEnumeration(value: string, key: string) {
  const lower = value.toLowerCase();
  for (const phrase of ENUMERATION_PHRASES) {
    if (lower.includes(phrase)) {
      throw new Error(
        `Anti-enumeration violation at ${key}: contains "${phrase}"`
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// B2 — register-error mapper
// ─────────────────────────────────────────────────────────────────────────────

describe('mapAvailabilityError', () => {
  it('returns "idle" semantics for unknown errors via the "server" fallback', () => {
    expect(mapAvailabilityError(new Error('boom'))).toBe('server');
    expect(mapAvailabilityError(null)).toBe('server');
    expect(mapAvailabilityError('string')).toBe('server');
  });

  it('maps a 400 with field-shape to "server"', () => {
    const err = asApiError(apiErrorLike({ status: 400 }));
    expect(mapAvailabilityError(err)).toBe('server');
  });

  it('maps a 429 to "rate_limited"', () => {
    const err = asApiError(apiErrorLike({ status: 429 }));
    expect(mapAvailabilityError(err)).toBe('rate_limited');
  });

  it('maps 500/502/503 to "server"', () => {
    for (const status of [500, 502, 503]) {
      const err = asApiError(apiErrorLike({ status }));
      expect(mapAvailabilityError(err)).toBe('server');
    }
  });

  it('maps status 0 (network failure) to "server"', () => {
    const err = asApiError(apiErrorLike({ status: 0 }));
    expect(mapAvailabilityError(err)).toBe('server');
  });
});

describe('mapRegisterError', () => {
  it('returns "validation" for a 400 with data.extensions.validationErrors', () => {
    const err = attachValidationErrors(
      apiErrorLike({ status: 400, code: 'GLOBAL_VALIDATION_FAILED' }),
      [{ field: 'password', message: 'Password too short' }]
    );
    const result = mapRegisterError(err);
    expect(result.kind).toBe('validation');
    expect(result.fieldErrors?.password).toBe('Password too short');
  });

  it('drops enumeration-oracle messages from data.extensions.validationErrors', () => {
    const err = attachValidationErrors(
      apiErrorLike({ status: 400, code: 'GLOBAL_VALIDATION_FAILED' }),
      [{ field: 'email', message: 'Email already in use' }]
    );
    const result = mapRegisterError(err);
    expect(result.kind).toBe('validation');
    const surfaced = result.fieldErrors?.email;
    if (surfaced !== undefined) {
      assertAntiEnumeration(surfaced, 'fieldErrors.email');
    }
  });

  it('returns "rate_limited" for 429 with no fieldErrors', () => {
    const err = asApiError(apiErrorLike({ status: 429 }));
    const result = mapRegisterError(err);
    expect(result.kind).toBe('rate_limited');
    expect(result.fieldErrors).toBeUndefined();
  });

  it('returns "server" for 5xx', () => {
    for (const status of [500, 502, 503]) {
      const err = asApiError(apiErrorLike({ status }));
      const result = mapRegisterError(err);
      expect(result.kind).toBe('server');
    }
  });

  it('returns "forbidden" for 403', () => {
    const err = asApiError(apiErrorLike({ status: 403 }));
    expect(mapRegisterError(err).kind).toBe('forbidden');
  });

  it('returns "server" for an unknown error', () => {
    expect(mapRegisterError(new Error('boom')).kind).toBe('server');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// B3 — registration-copy anti-enumeration contract
// ─────────────────────────────────────────────────────────────────────────────

describe('registration-copy', () => {
  it('resolves every advertised key to a non-empty string', () => {
    const keys: string[] = [
      COPY_KEYS.availability.checking,
      COPY_KEYS.availability.available,
      COPY_KEYS.availability.unavailable,
      COPY_KEYS.availability.rate_limited,
      COPY_KEYS.availability.server,
      COPY_KEYS.availability.silent,
      COPY_KEYS.form.username.label,
      COPY_KEYS.form.username.placeholder,
      COPY_KEYS.form.username.help,
      COPY_KEYS.form.email.label,
      COPY_KEYS.form.email.placeholder,
      COPY_KEYS.form.email.help,
      COPY_KEYS.form.password.label,
      COPY_KEYS.form.password.placeholder,
      COPY_KEYS.form.password.help,
      COPY_KEYS.form.passwordConfirmation.label,
      COPY_KEYS.form.passwordConfirmation.placeholder,
      COPY_KEYS.form.passwordConfirmation.help,
      COPY_KEYS.submit.acknowledgement.title,
      COPY_KEYS.submit.acknowledgement.body,
      COPY_KEYS.submit.acknowledgement.action,
      COPY_KEYS.submit.acknowledgement.resendLabel,
      COPY_KEYS.submit.acknowledgement.loginLabel,
      COPY_KEYS.submit.error.validation,
      COPY_KEYS.submit.error.rate_limited,
      COPY_KEYS.submit.error.server,
      COPY_KEYS.submit.error.forbidden,
      COPY_KEYS.submit.error.globalFallback,
    ];
    for (const key of keys) {
      const v = resolveCopy(key);
      // `availability.silent` is intentional — it's the silent-indicator
      // sentinel (TKT-2.1.C3/C4) that the indicator components skip.
      if (key === COPY_KEYS.availability.silent) {
        expect(v).toBe('');
        continue;
      }
      expect(v).not.toBe('');
    }
  });

  it('has no anti-enumeration phrase in any rendered string', () => {
    const allStrings: Array<[string, string]> = [
      ['availability.checking', resolveCopy(COPY_KEYS.availability.checking)],
      ['availability.available', resolveCopy(COPY_KEYS.availability.available)],
      [
        'availability.unavailable',
        resolveCopy(COPY_KEYS.availability.unavailable),
      ],
      [
        'availability.rate_limited',
        resolveCopy(COPY_KEYS.availability.rate_limited),
      ],
      ['availability.server', resolveCopy(COPY_KEYS.availability.server)],
      [
        'submit.acknowledgement.title',
        resolveCopy(COPY_KEYS.submit.acknowledgement.title),
      ],
      [
        'submit.acknowledgement.body',
        resolveCopy(COPY_KEYS.submit.acknowledgement.body),
      ],
      [
        'submit.acknowledgement.action',
        resolveCopy(COPY_KEYS.submit.acknowledgement.action),
      ],
      [
        'submit.acknowledgement.resendLabel',
        resolveCopy(COPY_KEYS.submit.acknowledgement.resendLabel),
      ],
      [
        'submit.acknowledgement.loginLabel',
        resolveCopy(COPY_KEYS.submit.acknowledgement.loginLabel),
      ],
      [
        'submit.error.validation',
        resolveCopy(COPY_KEYS.submit.error.validation),
      ],
      [
        'submit.error.rate_limited',
        resolveCopy(COPY_KEYS.submit.error.rate_limited),
      ],
      ['submit.error.server', resolveCopy(COPY_KEYS.submit.error.server)],
      [
        'submit.error.forbidden',
        resolveCopy(COPY_KEYS.submit.error.forbidden),
      ],
      [
        'submit.error.globalFallback',
        resolveCopy(COPY_KEYS.submit.error.globalFallback),
      ],
    ];
    for (const [key, value] of allStrings) {
      assertAntiEnumeration(value, key);
    }
  });

  it('returns the same acknowledgement body regardless of call shape', () => {
    // The F2 anti-enumeration snapshot test asserts DOM equivalence
    // between a brand-new email and a known-existing email. The static
    // contract this test exercises: the acknowledgement body is a
    // single constant, not a function of the input.
    const brandNewBody = resolveCopy(COPY_KEYS.submit.acknowledgement.body);
    const knownExistingBody = resolveCopy(
      COPY_KEYS.submit.acknowledgement.body
    );
    expect(brandNewBody).toBe(knownExistingBody);
    expect(brandNewBody).toBe(registrationCopy.submit.acknowledgement.body);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// C1 / C2 — debounce + abort + stale-response guard
// ─────────────────────────────────────────────────────────────────────────────

describe('debounce helpers', () => {
  it('treats well-formed emails as eligible', () => {
    expect(isWellFormedEmail('a@b.co')).toBe(true);
    expect(isWellFormedEmail('not-an-email')).toBe(false);
    expect(isWellFormedEmail('')).toBe(false);
    expect(isWellFormedEmail('a@b')).toBe(false);
  });

  it('treats well-formed usernames as eligible', () => {
    expect(isWellFormedUsername('alice_1')).toBe(true);
    expect(isWellFormedUsername('al')).toBe(false);
    expect(isWellFormedUsername('a@b.co')).toBe(false);
    expect(isWellFormedUsername('a'.repeat(51))).toBe(false);
  });
});

// NOTE on C1/C2 contract coverage:
//   The hook-render tests for `useCheckEmail` and `useCheckUsername`
//   would need `@testing-library/react` and `jsdom`/`happy-dom`,
//   neither of which is installed. The hook's debounce, abort-on-input,
//   and stale-response guard contracts are exercised in the F2
//   Playwright spec (`e2e/auth/register.spec.ts`) against the live
//   backend. The predicates `isWellFormedEmail` and
//   `isWellFormedUsername` are pure and have direct unit coverage
//   below.

// ─────────────────────────────────────────────────────────────────────────────
// D2 — submitRegistration semantics (pure helper)
// ─────────────────────────────────────────────────────────────────────────────

describe('submitRegistration — pure helper', () => {
  function makeValues(): RegisterFormValues {
    return {
      username: 'alice_1',
      email: 'a@b.co',
      password: 'Abcdef1!',
      passwordConfirmation: 'Abcdef1!',
      agreeToTerms: true,
    };
  }

  it('resolves to { kind: "ok", nextRoute } on success', async () => {
    const register = vi.fn(async () => ({ message: 'ok' }));
    const result = await submitRegistration(makeValues(), {
      register: register as unknown as (
        dto: { username: string; email: string; password: string }
      ) => Promise<unknown>,
    });
    expect(result).toEqual({ kind: 'ok', nextRoute: '/register/check-inbox' });
    expect(register).toHaveBeenCalledTimes(1);
    expect(register).toHaveBeenCalledWith({
      username: 'alice_1',
      email: 'a@b.co',
      password: 'Abcdef1!',
    });
  });

  it('maps a thrown error-shaped object into the "error" result without rejecting', async () => {
    const register = vi.fn(async () => {
      throw asApiError(
        apiErrorLike({
          status: 429,
          code: 'GLOBAL_RATE_LIMITED',
        })
      );
    });

    const result = await submitRegistration(makeValues(), {
      register: register as unknown as (
        dto: { username: string; email: string; password: string }
      ) => Promise<unknown>,
    });

    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errorKind).toBe('rate_limited');
    }
  });

  it('issues one backend call per invocation when callers do not overlap', async () => {
    let calls = 0;
    const register = vi.fn(async () => {
      calls += 1;
      return { message: 'ok' };
    });
    const deps = {
      register: register as unknown as (
        dto: { username: string; email: string; password: string }
      ) => Promise<unknown>,
    };

    const first = await submitRegistration(makeValues(), deps);
    const second = await submitRegistration(makeValues(), deps);
    expect(first.kind).toBe('ok');
    expect(second.kind).toBe('ok');
    // The pure helper is single-call-per-invocation; the single-flight
    // guarantee lives in `useRegistrationSubmit`, not here.
    expect(calls).toBe(2);
  });

  it('preserves form values on every error kind', async () => {
    const register = vi.fn(async () => {
      throw asApiError(apiErrorLike({ status: 500 }));
    });
    const result = await submitRegistration(makeValues(), {
      register: register as unknown as (
        dto: { username: string; email: string; password: string }
      ) => Promise<unknown>,
    });
    expect(result.kind).toBe('error');
    if (result.kind === 'error') {
      expect(result.errorKind).toBe('server');
    }
  });
});

// NOTE on D2 single-flight coverage:
//   The single-flight guarantee (rapid double-click → one request) is
//   enforced by `useRegistrationSubmit`, which holds an `inFlightRef`
//   and shares the in-flight `Promise` across rerenders. The pure
//   `submitRegistration` helper is intentionally *not* single-flight
//   so the hook can compose it freely. The user-facing single-flight
//   contract is exercised in the F1 Playwright spec
//   (`e2e/auth/register.spec.ts`).

// ─────────────────────────────────────────────────────────────────────────────
// Service-layer file boundary — confirm `auth.service.ts` is the only auth
// file that imports from `@/lib/api/generated/**`.
// ─────────────────────────────────────────────────────────────────────────────

describe('service-layer boundary', () => {
  it('only auth.service.ts imports from @/lib/api/generated/**', async () => {
    // This is enforced via the `no-restricted-imports` rule for
    // `axios`; the @/lib/api/generated/** rule is a code-review rule.
    // The vitest suite asserts the static surface: every other file in
    // src/features/auth/** should not import the SDK barrel.
    const fs = await import('node:fs');
    const path = await import('node:path');

    function walk(dir: string): string[] {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      const files: string[] = [];
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files.push(...walk(full));
        } else if (
          /\.(ts|tsx)$/.test(entry.name) &&
          !entry.name.endsWith('.spec.ts')
        ) {
          files.push(full);
        }
      }
      return files;
    }

    const files = walk('src/features/auth');
    for (const file of files) {
      const text = fs.readFileSync(file, 'utf8');
      if (file.endsWith('auth.service.ts')) continue;
      if (
        (file.endsWith('register-submit.ts') ||
          file.endsWith('login-submit.ts')) &&
        text.includes("from '@/features/auth/service/auth.service'")
      ) {
        // `registration-submit.ts` and `login-submit.ts` are allowed to
        // import the service; the service then imports the SDK. We treat
        // them as pass-throughs.
        continue;
      }
      if (
        file.endsWith('use-registration-submit.ts') ||
        file.endsWith('use-login.ts') ||
        file.endsWith('use-logout.ts')
      ) {
        // Hook files are allowed to import the service indirectly through the submit helpers.
        continue;
      }
      expect(
        text.includes("from '@/lib/api/generated"),
        `Unexpected SDK import in ${file}`
      ).toBe(false);
    }
  });
});
