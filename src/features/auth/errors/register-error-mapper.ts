

import { asApiErrorShape, containsEnumerationOracle } from './auth-shapes';

export type AvailabilityStatus =
| 'idle'
  | 'checking'
  | 'available'
  | 'unavailable'
  | 'rate_limited'
  | 'server'
  | 'silent';

export type RegisterErrorKind =
| 'validation'
  | 'rate_limited'
  | 'server'
  | 'forbidden';

export type RegisterFieldKey = 'username' | 'email' | 'password';

export type RegisterFieldErrors = Partial<Record<RegisterFieldKey, string>>;

export function mapAvailabilityError(err: unknown): AvailabilityStatus {
const shape = asApiErrorShape(err);
if (!shape) {
return 'server';
  }
if (shape.isValidationError) {

return 'server';
  }
if (shape.status === 429) {
return 'rate_limited';
  }
if (shape.isServerError || shape.status === 0) {

return 'server';
  }
return 'server';
}

export function mapRegisterError(err: unknown): {
kind: RegisterErrorKind;
fieldErrors?: RegisterFieldErrors;
globalMessage?: string;
} {
const shape = asApiErrorShape(err);
if (!shape) {
return { kind: 'server' };
  }

if (shape.isValidationError || shape.status === 422) {
const fieldErrors = sanitizeFieldErrors(err);
return { kind: 'validation', fieldErrors };
  }

if (shape.status === 429) {
return { kind: 'rate_limited' };
  }

if (shape.status === 403) {
return { kind: 'forbidden' };
  }

if (shape.isServerError || shape.status === 0) {
return { kind: 'server' };
  }

return { kind: 'server' };
}

function sanitizeFieldErrors(
err: unknown
): RegisterFieldErrors {
const allowed: RegisterFieldKey[] = ['username', 'email', 'password'];
const out: RegisterFieldErrors = {};

if (!err || typeof err !== 'object') return out;
const candidate = err as {
data?: { extensions?: { validationErrors?: Array<{ field: string; message: string }> } };
validationMessages?: string[];
  };

const extensionErrors = candidate.data?.extensions?.validationErrors;
if (Array.isArray(extensionErrors) && extensionErrors.length > 0) {
for (const entry of extensionErrors) {
const field = entry.field as RegisterFieldKey;
if (!allowed.includes(field)) continue;
if (containsEnumerationOracle(entry.message)) continue;
out[field] = entry.message;
    }
return out;
  }

const legacy = candidate.validationMessages ?? [];
if (legacy.length === 0) return out;
if (legacy.some(containsEnumerationOracle)) return out;

out.password = legacy[0];
return out;
}

