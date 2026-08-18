

export { customInstance } from './custom-instance';
export { authOnlyInstance } from './auth-only-instance';
export { ApiError, isApiError } from './ApiError';
export type { ApiErrorData } from './ApiError';
export type { CustomConfig } from './custom-instance';

import { ApiError as _ApiError } from './ApiError';

export const fromAxios = _ApiError.fromAxios.bind(_ApiError);