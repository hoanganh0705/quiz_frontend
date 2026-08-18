

import { asApiErrorShape, containsEnumerationOracle } from './auth-shapes';

export { containsEnumerationOracle, ENUMERATION_PHRASES, asApiErrorShape } from './auth-shapes';

export type LoginErrorKind =
| 'invalid_credentials'
  | 'rate_limited'
  | 'validation'
  | 'server';

export interface LoginErrorResult {
kind: LoginErrorKind;
}

const VERIFY_RELATED_PHRASES: ReadonlyArray<string> = Object.freeze([
'verify',
'verified',
'verification',
]);

const AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS';

const GLOBAL_VALIDATION_FAILED = 'GLOBAL_VALIDATION_FAILED';

export function mapLoginError(err: unknown): LoginErrorResult {
const shape = asApiErrorShape(err);
if (!shape) {

return { kind: 'server' };
  }

if (shape.status === 429) {
return { kind: 'rate_limited' };
  }

if (shape.status === 400 && shape.code === GLOBAL_VALIDATION_FAILED) {
return { kind: 'validation' };
  }

const isVerifyRelated = shape.validationMessages.some((m) =>
VERIFY_RELATED_PHRASES.some((phrase) => m.toLowerCase().includes(phrase))
  );

if (shape.status === 401) {
if (shape.code === AUTH_INVALID_CREDENTIALS) {
return { kind: 'invalid_credentials' };
    }
if (isVerifyRelated) {
return { kind: 'invalid_credentials' };
    }

return { kind: 'server' };
  }

if (shape.isServerError || shape.status === 0) {
return { kind: 'server' };
  }

return { kind: 'server' };
}

export type LogoutErrorKind = 'ok' | 'server';

export interface LogoutErrorResult {
kind: LogoutErrorKind;
}

export function mapLogoutError(err: unknown): LogoutErrorResult {
if (err === null || err === undefined) {
return { kind: 'ok' };
  }

const shape = asApiErrorShape(err);
if (!shape) {

return { kind: 'server' };
  }

if (shape.isServerError || shape.status === 0) {
return { kind: 'server' };
  }

return { kind: 'server' };
}

export function isEnumerationSafe(message: string): boolean {
return !containsEnumerationOracle(message);
}
