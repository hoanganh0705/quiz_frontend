

import {
asApiErrorShape,
containsEnumerationOracle,
} from './auth-shapes';

export {
containsEnumerationOracle,
ENUMERATION_PHRASES,
asApiErrorShape,
} from './auth-shapes';

export type VerifyEmailErrorKind =
| 'pending'
  | 'acknowledgement'
  | 'invalid_link'
  | 'rate_limited'
  | 'server';

export interface VerifyEmailErrorResult {
kind: VerifyEmailErrorKind;
}

export function mapVerifyEmailError(err: unknown): VerifyEmailErrorResult {
const shape = asApiErrorShape(err);
if (!shape) {

return { kind: 'acknowledgement' };
  }

if (shape.status === 429) {
return { kind: 'rate_limited' };
  }

return { kind: 'acknowledgement' };
}

export type ResendVerificationErrorKind = 'rate_limited' | 'server';

export interface ResendVerificationErrorResult {
kind: ResendVerificationErrorKind;
}

export function mapResendVerificationError(
err: unknown
): ResendVerificationErrorResult {
const shape = asApiErrorShape(err);
if (!shape) {
return { kind: 'server' };
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