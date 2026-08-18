

import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_INVALID_CURRENT_PASSWORD = 'AUTH_INVALID_CURRENT_PASSWORD' as const satisfies ErrorCode;
export const AUTH_DELETION_FAILED = 'AUTH_DELETION_FAILED' as const satisfies ErrorCode;
export const AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN' as const satisfies ErrorCode;
export const AUTH_RESOURCE_CONFLICT = 'AUTH_RESOURCE_CONFLICT' as const satisfies ErrorCode;
export const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED' as const satisfies ErrorCode;
export const USER_NOT_FOUND = 'USER_NOT_FOUND' as const satisfies ErrorCode;

export type DeletionErrorCode = Extract<
ErrorCode,
| typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_DELETION_FAILED
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
  | typeof USER_NOT_FOUND
>;

export const DELETION_KNOWN_CODES: ReadonlyArray<DeletionErrorCode> = Object.freeze([
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_DELETION_FAILED,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
USER_NOT_FOUND,
]);

export const DELETION_RECOVERYABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
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

export function isDeletionFailedError(
code: string,
): code is typeof AUTH_DELETION_FAILED {
return code === AUTH_DELETION_FAILED;
}

export function isUserNotFoundError(code: string): code is typeof USER_NOT_FOUND {
return code === USER_NOT_FOUND;
}

export function isDeletionErrorCode(code: string): code is DeletionErrorCode {
return (DELETION_KNOWN_CODES as readonly string[]).includes(code);
}

export function isDeletionRecoverableStatus(status: number): boolean {
return (DELETION_RECOVERYABLE_STATUSES as readonly number[]).includes(status);
}
