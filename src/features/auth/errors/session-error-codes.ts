

import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_SESSION_NOT_FOUND = 'AUTH_SESSION_NOT_FOUND' as const satisfies ErrorCode;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const satisfies ErrorCode;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const satisfies ErrorCode;

export type SessionErrorCode = Extract<
ErrorCode,
| typeof AUTH_SESSION_NOT_FOUND
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
>;

export const SESSION_KNOWN_CODES: ReadonlyArray<SessionErrorCode> = Object.freeze([
AUTH_SESSION_NOT_FOUND,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
]);

export const SESSION_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
0,
429,
500,
501,
502,
503,
504,
505,
506,
507,
508,
510,
511,
]);

export function isSessionNotFoundError(code: string): code is typeof AUTH_SESSION_NOT_FOUND {
return code === AUTH_SESSION_NOT_FOUND;
}

export function isSessionErrorCode(code: string): code is SessionErrorCode {
return (SESSION_KNOWN_CODES as readonly string[]).includes(code);
}

export function isSessionRecoverableStatus(status: number): boolean {
return (SESSION_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
