

import {
asApiErrorShape,
containsEnumerationOracle,
RECOVERY_ERROR_CODES,
} from './auth-shapes';

export { containsEnumerationOracle, ENUMERATION_PHRASES, asApiErrorShape } from './auth-shapes';

export type ForgotPasswordErrorKind =
| 'acknowledgement'
  | 'rate_limited'
  | 'server';

export interface ForgotPasswordErrorResult {
kind: ForgotPasswordErrorKind;
}

export function mapForgotPasswordError(err: unknown): ForgotPasswordErrorResult {
const shape = asApiErrorShape(err);
if (!shape) {

return { kind: 'acknowledgement' };
  }

if (shape.status === 429) {
return { kind: 'rate_limited' };
  }

return { kind: 'acknowledgement' };
}

export type ResetPasswordErrorKind =
| 'success'
  | 'invalid_link'
  | 'validation'
  | 'rate_limited'
  | 'server';

export interface ResetPasswordErrorResult {
kind: ResetPasswordErrorKind;
}

export function mapResetPasswordError(err: unknown): ResetPasswordErrorResult {
const shape = asApiErrorShape(err);
if (!shape) {
return { kind: 'server' };
  }

if (RECOVERY_ERROR_CODES.includes(shape.code) && shape.code === 'AUTH_INVALID_TOKEN') {
return { kind: 'invalid_link' };
  }

if (shape.status === 400 && shape.code === 'GLOBAL_VALIDATION_FAILED') {
return { kind: 'validation' };
  }

if (shape.status === 429) {
return { kind: 'rate_limited' };
  }

if (shape.isServerError || shape.status === 0) {
return { kind: 'server' };
  }

return { kind: 'server' };
}

export function isEnumerationSafe(message: string): boolean {
return !containsEnumerationOracle(message);
}

export const _RECOVERY_ERROR_CODES_REFERENCE = RECOVERY_ERROR_CODES;
