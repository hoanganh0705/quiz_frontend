

import { getAuth } from '@/lib/api';
import { ApiError } from '@/lib/api/core/ApiError';
import { mapDeletionError } from '@/features/auth/errors/deletion-error-mapper';
import {
AUTH_INVALID_TOKEN,
isUserNotFoundError,
} from '@/features/auth/errors/deletion-error-codes';

export type DeletionAccountExistence =
| 'exists'
  | 'already_deleted'
  | 'disabled'
  | 'unknown';

export type DeletionRevalidationResult =
| { kind: 'success'; outcome: DeletionAccountExistence }
  | { kind: 'error'; error: ApiError | unknown };

export interface RevalidateAccountExistsDeps {

fetchIdentity: () => Promise<unknown>;
}

const defaultRevalidateDeps: RevalidateAccountExistsDeps = {
fetchIdentity: async (): Promise<unknown> => {
const data = await getAuth().authControllerGetCurrentUser();
return data.data ?? null;
  },
};

export async function revalidateAccountExists(
deps: RevalidateAccountExistsDeps = defaultRevalidateDeps,
): Promise<DeletionRevalidationResult> {
let payload: unknown;
try {
payload = await deps.fetchIdentity();
  } catch (cause: unknown) {

const classification = mapDeletionError({
code: cause instanceof ApiError ? String(cause.code ?? '') : '',
status: cause instanceof ApiError ? Number(cause.status ?? 0) : 0,
    });

if (
classification.kind === 'not_found' ||
isUserNotFoundError(
cause instanceof ApiError ? String(cause.code ?? '') : '',
      )
    ) {
return { kind: 'success', outcome: 'already_deleted' };
    }

if (classification.kind === 'auth_terminal') {

return { kind: 'success', outcome: 'already_deleted' };
    }

if (cause instanceof ApiError && cause.status === 403) {
return { kind: 'success', outcome: 'disabled' };
    }

return { kind: 'success', outcome: 'unknown' };
  }

if (payload === null || payload === undefined) {

return { kind: 'success', outcome: 'already_deleted' };
  }

if (typeof payload === 'object') {
const obj = payload as Record<string, unknown>;

const code = typeof obj['code'] === 'string' ? obj['code'] : '';
if (code === 'AUTH_ACCOUNT_DISABLED' || code === AUTH_INVALID_TOKEN) {
return { kind: 'success', outcome: 'disabled' };
    }
  }

return { kind: 'success', outcome: 'exists' };
}

export const _internalRevalidateDeps = defaultRevalidateDeps;
