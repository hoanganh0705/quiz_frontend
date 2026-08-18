

import {
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_INVALID_TOKEN,
AUTH_PASSWORD_REUSE,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
isPasswordRecoverableStatus,
} from './password-error-codes';

export type PasswordErrorClassification =
| {
kind: 'invalid_current';
code: typeof AUTH_INVALID_CURRENT_PASSWORD;
status: number;
    }
  | {
kind: 'reuse';
code: typeof AUTH_PASSWORD_REUSE;
status: number;
    }
  | {
kind: 'validation';
code: typeof GLOBAL_VALIDATION_FAILED;
status: number;

validationMessages: string[];
    }
  | {
kind: 'auth_terminal';
code: typeof AUTH_INVALID_TOKEN;
status: number;
    }
  | {
kind: 'conflict';
code: typeof AUTH_RESOURCE_CONFLICT;
status: number;
    }
  | {
kind: 'retryable';
code: string;
status: number;
    };

export interface PasswordErrorInput {
code: string;
status: number;
validationMessages?: string[];
}

export function mapPasswordError(
error: PasswordErrorInput,
): PasswordErrorClassification {

if (error.code === AUTH_INVALID_CURRENT_PASSWORD) {
return {
kind: 'invalid_current',
code: AUTH_INVALID_CURRENT_PASSWORD,
status: error.status,
    };
  }

if (error.code === AUTH_PASSWORD_REUSE) {
return {
kind: 'reuse',
code: AUTH_PASSWORD_REUSE,
status: error.status,
    };
  }

if (error.code === GLOBAL_VALIDATION_FAILED) {
return {
kind: 'validation',
code: GLOBAL_VALIDATION_FAILED,
status: error.status,
validationMessages: error.validationMessages ?? [],
    };
  }

if (error.code === AUTH_INVALID_TOKEN) {
return {
kind: 'auth_terminal',
code: AUTH_INVALID_TOKEN,
status: error.status,
    };
  }

if (error.code === AUTH_RESOURCE_CONFLICT) {
return {
kind: 'conflict',
code: AUTH_RESOURCE_CONFLICT,
status: error.status,
    };
  }

if (isPasswordRecoverableStatus(error.status)) {
return {
kind: 'retryable',
code: error.code,
status: error.status,
    };
  }

return {
kind: 'retryable',
code: error.code,
status: error.status,
  };
}

export function isInvalidCurrentPassword(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'invalid_current' }> {
return classification.kind === 'invalid_current';
}

export function isPasswordReuse(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'reuse' }> {
return classification.kind === 'reuse';
}

export function isPasswordValidation(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'validation' }> {
return classification.kind === 'validation';
}

export function isAuthTerminalPasswordError(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'auth_terminal' }> {
return classification.kind === 'auth_terminal';
}

export function isPasswordConflict(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'conflict' }> {
return classification.kind === 'conflict';
}

export function isPasswordErrorRetryable(
classification: PasswordErrorClassification,
): classification is Extract<PasswordErrorClassification, { kind: 'retryable' }> {
return classification.kind === 'retryable';
}
