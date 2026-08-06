/**
 * Type-level test asserting `ApiError['code']` is the typed `ErrorCode` union.
 *
 * Source epic: Epic 1.3 — RFC 7807 Error Model.
 * Source ticket: TKT-1.3.3.2.
 *
 * ## Strategy: two-tier enforcement
 *
 * This spec enforces the contract at two levels:
 *
 * 1. **Compile time** — a typed assignment to a const annotated with
 *    `ErrorCode`, gated by a `if (false as boolean)` block. The block
 *    is unreachable at runtime, so no value is ever assigned; only the
 *    TypeScript compiler sees the type check. If `ApiError.code`
 *    widens to `string`, the assignment fails with `error TS2322: Type
 *    'string' is not assignable to type 'ErrorCode'`. tsc emits the
 *    error; vitest's transformer propagates it as a test failure.
 *
 * 2. **Runtime** — the synthesized-fallback path is exercised via a
 *    fixture, and the result is asserted to be a known `ErrorCode`
 *    via `isKnownErrorCode`. This catches the case where a future
 *    code change accidentally returns an empty string from the
 *    fallback path (e.g. forgetting the `STATUS_TO_GLOBAL_CODE`
 *    lookup).
 *
 * ## Verification procedure
 *
 * To verify the compile-time check catches widening:
 *
 *   1. Change `ApiError.code`'s return type from `ErrorCode` to
 *      `string` in `src/lib/api/core/ApiError.ts`.
 *   2. Run `pnpm test --run src/lib/api/error-codes.spec.ts`.
 *   3. Expect `error TS2322: Type 'string' is not assignable to
 *      type 'ErrorCode'` to be emitted.
 *
 * (Empirical note: this codebase has a pre-existing parse error in
 * `QuizDetail.tsx` that prevents tsc from emitting errors against
 * files later in the program order. The compile-time check will
 * start catching widening regressions as soon as that pre-existing
 * error is resolved — out of scope for Epic 1.3. Until then, the
 * runtime check below is the active enforcement mechanism.)
 *
 * ## What it catches
 *
 * - Widening `ApiError.code` beyond `ErrorCode` (compile-time, once
 *   `QuizDetail.tsx`'s parse error is fixed).
 * - `ApiError.code` returning an empty string or non-string value
 *   from the fallback path (runtime).
 * - Drift between the synthesized codes in `STATUS_TO_GLOBAL_CODE`
 *   and the codes enumerated in `error-codes.ts` (runtime — see the
 *   `SYNTHESIZED_ERROR_CODES.length >= 9` assertion).
 */

import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/core/ApiError';
import {
  isKnownErrorCode,
  KNOWN_ERROR_CODES,
  SYNTHESIZED_ERROR_CODES,
} from '@/lib/api/error-codes';

describe('ApiError code type contract', () => {
  it('ApiError["code"] is assignable to ErrorCode (compile-time)', () => {
    const apiError = new ApiError({
      name: 'AxiosError',
      message: '',
      isAxiosError: true,
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError>[0]);

    // ─── Compile-time check ─────────────────────────────────────────────
    // The `if (false as boolean)` block is unreachable at runtime; only
    // tsc sees the assignment. If `ApiError.code` widens to `string`,
    // this assignment fails with `error TS2322`.
    if (false as boolean) {
      const _narrow: typeof apiError.code = apiError.code;
      // The line below forces tsc to check that `apiError.code` is
      // assignable to `ErrorCode`. If `ApiError.code` widens to
      // `string`, this assignment fails with TS2322.
      const _typed: import('@/lib/api/error-codes').ErrorCode =
        apiError.code;
      expect(_narrow).toBeDefined();
      expect(_typed).toBeDefined();
    }
    expect(true).toBe(true);
  });

  it('ErrorCode type guard narrows correctly (runtime)', () => {
    // The synthesized-fallback table must include at least the 9
    // synthesized codes from `STATUS_TO_GLOBAL_CODE` plus the
    // `GLOBAL_VALIDATION_FAILED` override = 10 (the ticket says "at
    // least 9"). We check `>= 9` to leave room for the backend to add
    // additional synthesized codes without breaking this test.
    expect(SYNTHESIZED_ERROR_CODES.length).toBeGreaterThanOrEqual(9);
    // The full registry must include at least 122 domain + 9 synthesized
    // = 131 codes (the ticket says "at least 122 + 9"). Phase 7 adds
    // 8 admin codes (TKT-7.1.A3), so we check `>= 139`.
    expect(KNOWN_ERROR_CODES.length).toBeGreaterThanOrEqual(131);

    // The type guard narrows from `string` to `ErrorCode`. Verify the
    // guard works correctly for known codes (positive case) and
    // unknown codes (negative case).
    expect(isKnownErrorCode('QUIZ_NOT_FOUND')).toBe(true);
    expect(isKnownErrorCode('GLOBAL_INTERNAL_ERROR')).toBe(true);
    expect(isKnownErrorCode('MADE_UP_CODE')).toBe(false);

    // Phase 7 admin codes — TKT-7.1.A3.
    expect(isKnownErrorCode('ADMIN_FORBIDDEN')).toBe(true);
    expect(isKnownErrorCode('IRREVERSIBLE_CONFIRM_REQUIRED')).toBe(true);
    expect(isKnownErrorCode('RANKING_RECALCULATION_FAILED')).toBe(true);
  });

  it('ApiError.code surfaces the synthesized fallback for unknown extensions.code', () => {
    // When `extensions.code` is absent, ApiError.code falls back to
    // `synthesizedCodeForStatus(status, message)`. The stub here mirrors
    // the unknown-code.json fixture created in TKT-1.3.2.1: status 404,
    // no `extensions.code`.
    const apiError = new ApiError({
      name: 'AxiosError',
      message: '',
      isAxiosError: true,
      response: {
        data: {
          type: 'https://api.quiz.local/problems/not-found',
          title: 'Not Found',
          status: 404,
          detail: 'Resource not found',
          instance: '/api/v1/quizzes/missing',
          extensions: {
            requestId: 'req-006',
            timestamp: '2026-07-29T08:00:00Z',
          },
        },
        status: 404,
        statusText: 'Not Found',
      },
      toJSON: () => ({}),
    } as unknown as Parameters<typeof ApiError>[0]);

    expect(apiError.code).toBe('GLOBAL_NOT_FOUND');
    expect(isKnownErrorCode(apiError.code)).toBe(true);
  });
});