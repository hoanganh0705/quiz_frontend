

import { isRefreshTerminalError } from './refresh-error-codes';

export type RefreshErrorClassification =
| { kind: 'terminal'; reason: TerminalReason }
  | { kind: 'retryable'; reason: RetryableReason };

export type TerminalReason =
| 'token_reused'
  | 'session_context_mismatch'
  | 'invalid_refresh_token'
  | 'no_refresh_token';

export type RetryableReason =
| 'network_error'
  | 'server_error'
  | 'rate_limited'
  | 'unknown';

export interface RefreshErrorInput {
code: string;
status: number;
}

export function classifyRefreshError(error: RefreshErrorInput): RefreshErrorClassification {

if (isRefreshTerminalError(error.code)) {
switch (error.code) {
case 'AUTH_TOKEN_REUSED':
return { kind: 'terminal', reason: 'token_reused' };
case 'AUTH_SESSION_CONTEXT_MISMATCH':
return { kind: 'terminal', reason: 'session_context_mismatch' };
case 'AUTH_INVALID_REFRESH_TOKEN':
return { kind: 'terminal', reason: 'invalid_refresh_token' };
    }
  }

if (error.status === 401) {
return { kind: 'terminal', reason: 'no_refresh_token' };
  }

if (error.status === 0) {
return { kind: 'retryable', reason: 'network_error' };
  }

if (error.status >= 500 && error.status < 600) {
return { kind: 'retryable', reason: 'server_error' };
  }

if (error.status === 429) {
return { kind: 'retryable', reason: 'rate_limited' };
  }

return { kind: 'retryable', reason: 'unknown' };
}

export function isTerminalRefreshError(
classification: RefreshErrorClassification,
): classification is Extract<RefreshErrorClassification, { kind: 'terminal' }> {
return classification.kind === 'terminal';
}

export function isRetryableRefreshError(
classification: RefreshErrorClassification,
): classification is Extract<RefreshErrorClassification, { kind: 'retryable' }> {
return classification.kind === 'retryable';
}
