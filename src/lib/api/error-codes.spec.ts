

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

if (false as boolean) {
const _narrow: typeof apiError.code = apiError.code;

const _typed: import('@/lib/api/error-codes').ErrorCode =
apiError.code;
expect(_narrow).toBeDefined();
expect(_typed).toBeDefined();
    }
expect(true).toBe(true);
  });

it('ErrorCode type guard narrows correctly (runtime)', () => {

expect(SYNTHESIZED_ERROR_CODES.length).toBeGreaterThanOrEqual(9);

expect(KNOWN_ERROR_CODES.length).toBeGreaterThanOrEqual(131);

expect(isKnownErrorCode('QUIZ_NOT_FOUND')).toBe(true);
expect(isKnownErrorCode('GLOBAL_INTERNAL_ERROR')).toBe(true);
expect(isKnownErrorCode('MADE_UP_CODE')).toBe(false);

expect(isKnownErrorCode('ADMIN_FORBIDDEN')).toBe(true);
expect(isKnownErrorCode('IRREVERSIBLE_CONFIRM_REQUIRED')).toBe(true);
expect(isKnownErrorCode('RANKING_RECALCULATION_FAILED')).toBe(true);
  });

it('ApiError.code surfaces the synthesized fallback for unknown extensions.code', () => {

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