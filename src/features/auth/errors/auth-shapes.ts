

export interface ApiErrorShape {
code: string;
status: number;
isValidationError: boolean;
isServerError: boolean;
validationMessages: string[];
}

export function asApiErrorShape(err: unknown): ApiErrorShape | null {
if (!err || typeof err !== 'object') return null;
const obj = err as Partial<ApiErrorShape>;
if (
typeof obj.status !== 'number' ||
typeof obj.code !== 'string' ||
typeof obj.isValidationError !== 'boolean' ||
typeof obj.isServerError !== 'boolean' ||
!Array.isArray(obj.validationMessages)
  ) {
return null;
  }
return {
code: obj.code,
status: obj.status,
isValidationError: obj.isValidationError,
isServerError: obj.isServerError,
validationMessages: obj.validationMessages,
  };
}

export const ENUMERATION_PHRASES: ReadonlyArray<string> = Object.freeze([
'already',
'duplicate',
'exists',
'taken',
'in use',
'verified',
'invalid token',
'expired token',
'success',
'account created',
]);

export function containsEnumerationOracle(message: string): boolean {
if (!message) return false;
const lower = message.toLowerCase();
return ENUMERATION_PHRASES.some((phrase) => lower.includes(phrase));
}

export type RecoveryErrorCode =
| 'AUTH_INVALID_TOKEN'
  | 'GLOBAL_VALIDATION_FAILED'
  | 'GLOBAL_RATE_LIMITED';

export const RECOVERY_ERROR_CODES: ReadonlyArray<string> = Object.freeze([
'AUTH_INVALID_TOKEN',
'GLOBAL_VALIDATION_FAILED',
'GLOBAL_RATE_LIMITED',
]);