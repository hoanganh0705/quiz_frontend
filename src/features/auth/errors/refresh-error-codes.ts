

import type { ErrorCode } from '@/lib/api/error-codes';

export const AUTH_TOKEN_REUSED = 'AUTH_TOKEN_REUSED' as const satisfies ErrorCode;
export const AUTH_SESSION_CONTEXT_MISMATCH = 'AUTH_SESSION_CONTEXT_MISMATCH' as const satisfies ErrorCode;
export const AUTH_INVALID_REFRESH_TOKEN = 'AUTH_INVALID_REFRESH_TOKEN' as const satisfies ErrorCode;

export const REFRESH_TERMINAL_ERROR_CODES = [
AUTH_TOKEN_REUSED,
AUTH_SESSION_CONTEXT_MISMATCH,
AUTH_INVALID_REFRESH_TOKEN,
] as const;

export type RefreshTerminalErrorCode = Extract<
ErrorCode,
| typeof AUTH_TOKEN_REUSED
  | typeof AUTH_SESSION_CONTEXT_MISMATCH
  | typeof AUTH_INVALID_REFRESH_TOKEN
>;

export function isRefreshTerminalError(
code: string,
): code is RefreshTerminalErrorCode {
return (REFRESH_TERMINAL_ERROR_CODES as readonly string[]).includes(code);
}
