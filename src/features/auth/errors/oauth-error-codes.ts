

import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_OAUTH_INVALID_TOKEN = 'AUTH_OAUTH_INVALID_TOKEN' as const satisfies ErrorCode;

export const AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS =
'AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS' as const satisfies ErrorCode;

export const AUTH_OAUTH_LINKING_REQUIRED = 'AUTH_OAUTH_LINKING_REQUIRED' as const satisfies ErrorCode;

export type GoogleOAuthErrorCode = Extract<
ErrorCode,
| typeof AUTH_OAUTH_INVALID_TOKEN
  | typeof AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS
  | typeof AUTH_OAUTH_LINKING_REQUIRED
>;

export const GOOGLE_OAUTH_ERROR_CODES = Object.freeze([
AUTH_OAUTH_INVALID_TOKEN,
AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS,
AUTH_OAUTH_LINKING_REQUIRED,
] as const);
