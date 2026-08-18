

import { asApiErrorShape } from './auth-shapes';
import {
AUTH_OAUTH_INVALID_TOKEN,
AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS,
AUTH_OAUTH_LINKING_REQUIRED,
} from './oauth-error-codes';

export type GoogleLoginErrorKind =
| 'invalid_token'
  | 'account_conflict'
  | 'linking_required'
  | 'retryable';

export interface GoogleLoginErrorResult {
kind: GoogleLoginErrorKind;
}

export function mapGoogleLoginError(err: unknown): GoogleLoginErrorResult {
const shape = asApiErrorShape(err);

if (!shape) {
return { kind: 'retryable' };
  }

if (shape.code === AUTH_OAUTH_INVALID_TOKEN) {
return { kind: 'invalid_token' };
  }

if (shape.code === AUTH_OAUTH_ACCOUNT_ALREADY_EXISTS) {
return { kind: 'account_conflict' };
  }

if (shape.code === AUTH_OAUTH_LINKING_REQUIRED) {
return { kind: 'linking_required' };
  }

if (shape.status === 429) {
return { kind: 'retryable' };
  }

if (shape.isServerError || shape.status === 0) {
return { kind: 'retryable' };
  }

return { kind: 'retryable' };
}
