

import {
AUTH_DELETION_FAILED,
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
USER_NOT_FOUND,
isDeletionRecoverableStatus,
isUserNotFoundError,
} from './deletion-error-codes';

export type DeletionErrorClassification =
| {
kind: 'invalid_current';
code: typeof AUTH_INVALID_CURRENT_PASSWORD;
status: number;
    }
  | {
kind: 'conflict';
code: typeof AUTH_DELETION_FAILED | typeof AUTH_RESOURCE_CONFLICT;
status: number;
    }
  | {
kind: 'not_found';
code: typeof USER_NOT_FOUND;
status: number;
    }
  | {
kind: 'auth_terminal';
code: typeof AUTH_INVALID_TOKEN;
status: number;
    }
  | {
kind: 'validation';
code: typeof GLOBAL_VALIDATION_FAILED;
status: number;

validationMessages: string[];
    }
  | {
kind: 'uncertain';
code: string;
status: number;
    };

export interface DeletionErrorInput {
code: string;
status: number;
validationMessages?: string[];
}

export function mapDeletionError(
error: DeletionErrorInput,
): DeletionErrorClassification {

if (error.code === AUTH_INVALID_CURRENT_PASSWORD) {
return {
kind: 'invalid_current',
code: AUTH_INVALID_CURRENT_PASSWORD,
status: error.status,
    };
  }

if (error.code === AUTH_DELETION_FAILED) {
return {
kind: 'conflict',
code: AUTH_DELETION_FAILED,
status: error.status,
    };
  }

if (isUserNotFoundError(error.code)) {
return {
kind: 'not_found',
code: USER_NOT_FOUND,
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

if (isDeletionRecoverableStatus(error.status)) {
return {
kind: 'uncertain',
code: error.code,
status: error.status,
    };
  }

return {
kind: 'uncertain',
code: error.code,
status: error.status,
  };
}

export function isInvalidCurrentPasswordDeletion(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'invalid_current' }> {
return classification.kind === 'invalid_current';
}

export function isDeletionConflict(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'conflict' }> {
return classification.kind === 'conflict';
}

export function isDeletionNotFound(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'not_found' }> {
return classification.kind === 'not_found';
}

export function isAuthTerminalDeletionError(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'auth_terminal' }> {
return classification.kind === 'auth_terminal';
}

export function isDeletionValidation(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'validation' }> {
return classification.kind === 'validation';
}

export function isDeletionUncertain(
classification: DeletionErrorClassification,
): classification is Extract<DeletionErrorClassification, { kind: 'uncertain' }> {
return classification.kind === 'uncertain';
}
