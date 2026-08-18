

import { ApiError } from '@/lib/api/core/ApiError';
import type { ApiErrorInput } from '@/lib/api/error-types';

export type { ApiErrorInput } from '@/lib/api/error-types';

function isAxiosErrorLike(value: unknown): value is Parameters<
typeof ApiError.fromAxios
>[0] {
if (typeof value !== 'object' || value === null) return false;

if ('isAxiosError' in value && (value as { isAxiosError?: unknown }).isAxiosError === true) {
return true;
  }

const response = (value as { response?: unknown }).response;
if (typeof response !== 'object' || response === null) return false;
const r = response as { data?: unknown; status?: unknown };
return 'data' in r || 'status' in r;
}

export function coerceToApiError(caught: unknown): ApiError {

if (caught instanceof ApiError) {
return caught;
  }

if (isAxiosErrorLike(caught)) {
return ApiError.fromAxios(caught);
  }

if (looksLikeApiErrorInput(caught)) {
return ApiError.fromInput(caught);
  }

return ApiError.fromInput({
status: 0,
code: 'GLOBAL_INTERNAL_ERROR',
title: 'UnknownError',
message: String(caught),
requestId: 'client-unknown',
  });
}

function looksLikeApiErrorInput(value: unknown): value is ApiErrorInput {
if (typeof value !== 'object' || value === null) return false;
const v = value as Record<string, unknown>;
return (
typeof v.code === 'string' ||
typeof v.status === 'number' ||
typeof v.message === 'string'
  );
}
