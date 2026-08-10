/**
 * Core API layer barrel exports.
 *
 * Source epic: Epic 1.4 — Custom Instance Hardening.
 * Source ticket: TKT-1.4.5.1.
 *
 * `fromAxios` is the static factory on `ApiError` (added in TKT-1.4.5.1),
 * exposed as a standalone function via `.bind(ApiError)` so downstream
 * callers can `import { fromAxios } from '@/lib/api/core'` without
 * importing the class. Static methods on a class are not iterable on the
 * class object itself, so the bind is required to call `fromAxios(error)`
 * as a free function.
 */

export { customInstance } from './custom-instance';
export { authOnlyInstance } from './auth-only-instance';
export { ApiError, isApiError } from './ApiError';
export type { ApiErrorData } from './ApiError';
export type { CustomConfig } from './custom-instance';

// Bind the static factory so it can be imported as a free function.
import { ApiError as _ApiError } from './ApiError';

export const fromAxios = _ApiError.fromAxios.bind(_ApiError);