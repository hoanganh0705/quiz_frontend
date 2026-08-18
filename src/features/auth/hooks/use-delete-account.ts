'use client';

import { useCallback, useMemo, useRef, useState } from 'react';
import {
deleteAccount as defaultDeleteAccount,
} from '@/features/auth/services/auth.service';
import {
mapDeletionError,
isAuthTerminalDeletionError,
isDeletionConflict,
isDeletionNotFound,
isDeletionUncertain,
isDeletionValidation,
isInvalidCurrentPasswordDeletion,
type DeletionErrorClassification,
} from '@/features/auth/errors/deletion-error-mapper';
import { ApiError } from '@/lib/api/core/ApiError';
import type { DeleteAccountResponseDto } from '@/lib/api';
import {
runDeletionFinalization,
} from '@/features/auth/lifecycle/deletion-finalization';
import {
revalidateAccountExists,
type DeletionAccountExistence,
} from '@/features/auth/lifecycle/deletion-revalidation';
import {
clearSensitiveDeletionFormValues,
type DeletionFormSetters,
} from '@/features/auth/lifecycle/deletion-persisted-state';
import {
initialDeletionState,
isTerminalDeletionState,
type DeletionState,
type DeletionStateError,
} from '@/features/auth/types/deletion-state';

export const DELETION_INTENT_TOKEN = 'DELETE' as const;

export type UseDeleteAccountSubmitResult =
| { kind: 'success'; message: string }
  | { kind: 'invalid_current'; cause: ApiError | unknown }
  | { kind: 'conflict'; cause: ApiError | unknown }
  | { kind: 'uncertain'; cause: ApiError | unknown }
  | { kind: 'auth_terminal'; cause: ApiError | unknown }
  | { kind: 'validation'; cause: ApiError | unknown; validationMessages: string[] }
  | { kind: 'already_deleted'; cause?: ApiError | unknown }
  | { kind: 'rejected_local'; reason: 'empty_password' | 'intent_mismatch' | 'requires_revalidation' }
  | { kind: 'deduped' };

export interface UseDeleteAccountResult {

state: DeletionState;

submit: (
password: string,
typedConfirmation: string,
  ) => Promise<UseDeleteAccountSubmitResult>;

revalidate: () => Promise<DeletionAccountExistence | null>;

reset: (formSetters?: Partial<DeletionFormSetters>) => void;
}

export interface UseDeleteAccountDeps {
deleteAccount?: (dto: { password: string }) => Promise<DeleteAccountResponseDto>;

finalize?: () => Promise<{ alreadyFinalized: boolean }>;

revalidateAccountExists?: typeof revalidateAccountExists;
}

export const defaultDeleteAccountDeps: UseDeleteAccountDeps = {
deleteAccount: defaultDeleteAccount,
finalize: async () => {
const result = await runDeletionFinalization();
return { alreadyFinalized: result.alreadyFinalized };
  },
revalidateAccountExists,
};

function toDeletionStateError(cause: unknown): DeletionStateError {
if (cause instanceof ApiError) {
return {
classification: mapDeletionError({
code: String(cause.code ?? ''),
status: Number(cause.status ?? 0),
validationMessages: Array.isArray(cause.validationMessages)
? cause.validationMessages
: [],
      }),
cause,
    };
  }

return {
classification: mapDeletionError({ code: '', status: 0 }),
cause,
  };
}

export function useDeleteAccount(
deps: UseDeleteAccountDeps = defaultDeleteAccountDeps,
): UseDeleteAccountResult {
const [state, setState] = useState<DeletionState>(initialDeletionState);

const resolvedDeps: Required<UseDeleteAccountDeps> = useMemo(
() => ({
deleteAccount:
deps.deleteAccount ?? defaultDeleteAccountDeps.deleteAccount!,
finalize: deps.finalize ?? defaultDeleteAccountDeps.finalize!,
revalidateAccountExists:
deps.revalidateAccountExists ??
defaultDeleteAccountDeps.revalidateAccountExists!,
    }),
[deps],
  );

const inFlightRef = useRef<Promise<UseDeleteAccountSubmitResult> | null>(
null,
  );

const submit = useCallback(
async (
password: string,
typedConfirmation: string,
    ): Promise<UseDeleteAccountSubmitResult> => {

if (inFlightRef.current) {
return inFlightRef.current;
      }

if (isTerminalDeletionState(state)) {
return { kind: 'deduped' };
      }

if (password.length === 0) {
setState((prev) => {
if (prev.kind !== 'idle') return prev;
return {
...prev,
error: {
classification: mapDeletionError({ code: '', status: 0 }),
cause: null,
            },
          };
        });
return { kind: 'rejected_local', reason: 'empty_password' };
      }
if (typedConfirmation !== DELETION_INTENT_TOKEN) {
setState((prev) => {
if (prev.kind !== 'idle') return prev;
return {
...prev,
error: {
classification: mapDeletionError({ code: '', status: 0 }),
cause: null,
            },
          };
        });
return { kind: 'rejected_local', reason: 'intent_mismatch' };
      }

const hasRetryableError =
(state.kind === 'idle' || state.kind === 'uncertain') &&
state.error !== null;
if (hasRetryableError) {
const c = state.error.classification;
const requiresRevalidation =
isDeletionUncertain(c) || isDeletionConflict(c);
if (requiresRevalidation && state.lastRevalidation === null) {
return { kind: 'rejected_local', reason: 'requires_revalidation' };
        }
      }

const inFlight = (async (): Promise<UseDeleteAccountSubmitResult> => {
setState((prev) => ({
kind: 'pending',
inFlight: Promise.resolve(undefined),
error: null,
lastRevalidation:
prev.kind === 'idle' ? prev.lastRevalidation : null,
        }));

let response: DeleteAccountResponseDto;
try {
response = await resolvedDeps.deleteAccount({ password });
        } catch (cause: unknown) {
const error = toDeletionStateError(cause);
const c = error.classification;

if (isDeletionNotFound(c)) {
setState({
kind: 'cleanup',
isFinalized: false,
error: null,
lastRevalidation: null,
            });
await resolvedDeps.finalize();
setState({
kind: 'completed',
isFinalized: true,
error: null,
lastRevalidation: null,
            });
return { kind: 'already_deleted', cause };
          }

if (isAuthTerminalDeletionError(c)) {
setState((prev) => ({
kind: 'uncertain',
error,
lastRevalidation:
prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
return { kind: 'auth_terminal', cause };
          }

if (isInvalidCurrentPasswordDeletion(c)) {
setState((prev) => ({
kind: 'idle',
error,
lastRevalidation:
prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
return { kind: 'invalid_current', cause };
          }

if (isDeletionValidation(c)) {
setState((prev) => ({
kind: 'idle',
error,
lastRevalidation:
prev.kind === 'pending' ? null : prev.lastRevalidation,
            }));
return {
kind: 'validation',
cause,
validationMessages: c.validationMessages,
            };
          }

if (isDeletionUncertain(c)) {
setState({
kind: 'uncertain',
error,
lastRevalidation: null,
            });
return { kind: 'uncertain', cause };
          }

if (isDeletionConflict(c)) {
setState({
kind: 'uncertain',
error,
lastRevalidation: null,
            });
return { kind: 'conflict', cause };
          }

setState({
kind: 'uncertain',
error,
lastRevalidation: null,
          });
return { kind: 'uncertain', cause };
        }

setState({
kind: 'cleanup',
isFinalized: false,
error: null,
lastRevalidation: null,
        });

try {
await resolvedDeps.finalize();
        } catch {
          // Coordinator failures are best-effort and already
          // collected into the result. We swallow here because the
          // backend already committed deletion; the UI MUST proceed
          // to `completed` regardless of cleanup errors.
        }

setState({
kind: 'completed',
isFinalized: true,
error: null,
lastRevalidation: null,
        });

return { kind: 'success', message: response.message };
      })();

inFlightRef.current = inFlight;
try {
return await inFlight;
      } finally {

if (inFlightRef.current === inFlight) {
inFlightRef.current = null;
        }
      }
    },
[resolvedDeps, state],
  );

const revalidate = useCallback(async (): Promise<
DeletionAccountExistence | null
  > => {
const result = await resolvedDeps.revalidateAccountExists();

if (result.kind === 'error') {

setState((prev) => {
if (prev.kind !== 'idle' && prev.kind !== 'uncertain') return prev;
return { ...prev, lastRevalidation: 'unknown' };
      });
return 'unknown';
    }

const outcome = result.outcome;

setState((prev) => {
if (prev.kind === 'idle') {
return { ...prev, lastRevalidation: outcome };
      }
if (prev.kind === 'uncertain') {
return { ...prev, lastRevalidation: outcome };
      }
return prev;
    });

if (outcome === 'already_deleted') {
setState({
kind: 'cleanup',
isFinalized: false,
error: null,
lastRevalidation: 'already_deleted',
      });
try {
await resolvedDeps.finalize();
      } catch {
        // best-effort
      }
setState({
kind: 'completed',
isFinalized: true,
error: null,
lastRevalidation: 'already_deleted',
      });
    }

return outcome;
  }, [resolvedDeps]);

const reset = useCallback(
(formSetters?: Partial<DeletionFormSetters>): void => {
if (formSetters) {
clearSensitiveDeletionFormValues(formSetters);
      }
setState(initialDeletionState);
inFlightRef.current = null;
    },
[],
  );

return useMemo(
() => ({ state, submit, revalidate, reset }),
[state, submit, revalidate, reset],
  );
}

export type { DeletionErrorClassification };
