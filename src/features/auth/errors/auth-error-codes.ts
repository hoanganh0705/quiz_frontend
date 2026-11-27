import type { ErrorCode } from "@/lib/api/error-codes";

export const AUTH_INVALID_CURRENT_PASSWORD =
  "AUTH_INVALID_CURRENT_PASSWORD" as const satisfies ErrorCode;
export const AUTH_PASSWORD_REUSE =
  "AUTH_PASSWORD_REUSE" as const satisfies ErrorCode;
export const AUTH_DELETION_FAILED =
  "AUTH_DELETION_FAILED" as const satisfies ErrorCode;
export const AUTH_SESSION_NOT_FOUND =
  "AUTH_SESSION_NOT_FOUND" as const satisfies ErrorCode;
export const AUTH_INVALID_TOKEN =
  "AUTH_INVALID_TOKEN" as const satisfies ErrorCode;
export const AUTH_RESOURCE_CONFLICT =
  "AUTH_RESOURCE_CONFLICT" as const satisfies ErrorCode;
export const GLOBAL_VALIDATION_FAILED =
  "GLOBAL_VALIDATION_FAILED" as const satisfies ErrorCode;
export const USER_NOT_FOUND = "USER_NOT_FOUND" as const satisfies ErrorCode;

export type DeletionErrorCode = Extract<
  ErrorCode,
  | typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_DELETION_FAILED
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
  | typeof USER_NOT_FOUND
>;

export type PasswordErrorCode = Extract<
  ErrorCode,
  | typeof AUTH_INVALID_CURRENT_PASSWORD
  | typeof AUTH_PASSWORD_REUSE
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
  | typeof GLOBAL_VALIDATION_FAILED
>;

export type SessionErrorCode = Extract<
  ErrorCode,
  | typeof AUTH_SESSION_NOT_FOUND
  | typeof AUTH_INVALID_TOKEN
  | typeof AUTH_RESOURCE_CONFLICT
>;

export const AUTH_RECOVERABLE_STATUSES: ReadonlyArray<number> = Object.freeze([
  0, 429, 500, 501, 502, 503, 504, 505, 506, 507, 508, 510, 511,
]);

export const DELETION_KNOWN_CODES: ReadonlyArray<DeletionErrorCode> =
  Object.freeze([
    AUTH_INVALID_CURRENT_PASSWORD,
    AUTH_DELETION_FAILED,
    AUTH_INVALID_TOKEN,
    AUTH_RESOURCE_CONFLICT,
    GLOBAL_VALIDATION_FAILED,
    USER_NOT_FOUND,
  ]);

export const PASSWORD_KNOWN_CODES: ReadonlyArray<PasswordErrorCode> =
  Object.freeze([
    AUTH_INVALID_CURRENT_PASSWORD,
    AUTH_PASSWORD_REUSE,
    AUTH_INVALID_TOKEN,
    AUTH_RESOURCE_CONFLICT,
    GLOBAL_VALIDATION_FAILED,
  ]);

export const SESSION_KNOWN_CODES: ReadonlyArray<SessionErrorCode> =
  Object.freeze([
    AUTH_SESSION_NOT_FOUND,
    AUTH_INVALID_TOKEN,
    AUTH_RESOURCE_CONFLICT,
  ]);

export const DELETION_RECOVERYABLE_STATUSES = AUTH_RECOVERABLE_STATUSES;
export const PASSWORD_RECOVERYABLE_STATUSES = AUTH_RECOVERABLE_STATUSES;
export const SESSION_RECOVERYABLE_STATUSES = AUTH_RECOVERABLE_STATUSES;

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

export function isDeletionFailedError(
  code: string,
): code is typeof AUTH_DELETION_FAILED {
  return code === AUTH_DELETION_FAILED;
}

export function isUserNotFoundError(
  code: string,
): code is typeof USER_NOT_FOUND {
  return code === USER_NOT_FOUND;
}

export function isSessionNotFoundError(
  code: string,
): code is typeof AUTH_SESSION_NOT_FOUND {
  return code === AUTH_SESSION_NOT_FOUND;
}

export function isDeletionErrorCode(code: string): code is DeletionErrorCode {
  return (DELETION_KNOWN_CODES as readonly string[]).includes(code);
}

export function isPasswordErrorCode(code: string): code is PasswordErrorCode {
  return (PASSWORD_KNOWN_CODES as readonly string[]).includes(code);
}

export function isSessionErrorCode(code: string): code is SessionErrorCode {
  return (SESSION_KNOWN_CODES as readonly string[]).includes(code);
}

export function isAuthRecoverableStatus(status: number): boolean {
  return (AUTH_RECOVERABLE_STATUSES as readonly number[]).includes(status);
}

export const isDeletionRecoverableStatus = isAuthRecoverableStatus;
export const isPasswordRecoverableStatus = isAuthRecoverableStatus;
export const isSessionRecoverableStatus = isAuthRecoverableStatus;
