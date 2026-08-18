

import {
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
AUTH_SESSION_NOT_FOUND,
isSessionRecoverableStatus,
} from './session-error-codes';

export type SessionErrorTarget =

| 'self'
  /** Revoking a single non-current session. */
  | 'other'
  /** Listing the active sessions (read). */
  | 'list'
  /** Revoking all other sessions. */
  | 'revoke-others'
  /** Fetching the security dashboard (read). */
  | 'dashboard'
  /** Logging out everywhere. */
  | 'logout-all';

export type SessionErrorClassification =
| {
kind: 'already_revoked';
code: typeof AUTH_SESSION_NOT_FOUND;
status: number;
target: SessionErrorTarget;
    }
  | {
kind: 'current_revoked';
code: typeof AUTH_SESSION_NOT_FOUND;
status: number;
target: 'self';
    }
  | {
kind: 'auth_terminal';
code: typeof AUTH_INVALID_TOKEN;
status: number;
target: SessionErrorTarget;
    }
  | {
kind: 'conflict';
code: typeof AUTH_RESOURCE_CONFLICT;
status: number;
target: SessionErrorTarget;
    }
  | {
kind: 'retryable';
code: string;
status: number;
target: SessionErrorTarget;
    };

export interface SessionErrorInput {
code: string;
status: number;
target: SessionErrorTarget;
}

export function mapSessionError(
error: SessionErrorInput,
): SessionErrorClassification {

if (error.code === AUTH_SESSION_NOT_FOUND) {
if (error.target === 'self') {
return {
kind: 'current_revoked',
code: AUTH_SESSION_NOT_FOUND,
status: error.status,
target: 'self',
      };
    }

return {
kind: 'already_revoked',
code: AUTH_SESSION_NOT_FOUND,
status: error.status,
target: error.target,
    };
  }

if (error.code === AUTH_INVALID_TOKEN) {
return {
kind: 'auth_terminal',
code: AUTH_INVALID_TOKEN,
status: error.status,
target: error.target,
    };
  }

if (error.code === AUTH_RESOURCE_CONFLICT) {
return {
kind: 'conflict',
code: AUTH_RESOURCE_CONFLICT,
status: error.status,
target: error.target,
    };
  }

if (isSessionRecoverableStatus(error.status)) {
return {
kind: 'retryable',
code: error.code,
status: error.status,
target: error.target,
    };
  }

return {
kind: 'retryable',
code: error.code,
status: error.status,
target: error.target,
  };
}

export function isAlreadyRevoked(
classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'already_revoked' }> {
return classification.kind === 'already_revoked';
}

export function isCurrentRevoked(
classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'current_revoked' }> {
return classification.kind === 'current_revoked';
}

export function isAuthTerminalSessionError(
classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'auth_terminal' }> {
return classification.kind === 'auth_terminal';
}

export function isSessionErrorRetryable(
classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'retryable' }> {
return classification.kind === 'retryable';
}

export function isSessionConflict(
classification: SessionErrorClassification,
): classification is Extract<SessionErrorClassification, { kind: 'conflict' }> {
return classification.kind === 'conflict';
}
