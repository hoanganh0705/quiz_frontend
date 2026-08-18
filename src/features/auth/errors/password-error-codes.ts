

import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD' as const satisfies ErrorCode;
export const AUTH_PASSWORD_REUSE = 'AUTH_PASSWORD_REUSE' as const satisfies ErrorCode;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const satisfies ErrorCode;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const satisfies ErrorCode;
export const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED' as const satisfies ErrorCode;

export type PasswordErrorCode = Extract<
ErrorCode,
| typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_PASSWORD_REUSE
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
>;

export const PASSWORD_KNOWN_CODES: ReadonlyArray<PasswordErrorCode> = Object.freeze([
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_PASSWORD_REUSE,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
]);

export const PASSWORD_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
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

export function isInvalidCurrentPasswordError(
code: string,
): code is typeof AUTH_INVALID_CURRENT_PASSWORD {
return code === AUTH_INVALID_CURRENT_PASSWORD;
}

export function isPasswordReuseError(
code: string,
): code is typeof AUTH_PASSWORD_REUSE {
return code === AUTH_PASSWORD_REUSE;
}

export function isPasswordErrorCode(code: string): code is PasswordErrorCode {
return (PASSWORD_KNOWN_CODES as readonly string[]).includes(code);
}

export function isPasswordRecoverableStatus(status: number): boolean {
return (PASSWORD_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
