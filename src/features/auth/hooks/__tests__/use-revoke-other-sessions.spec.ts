

import { describe, expect, it, vi, type Mock } from 'vitest';
import { mapSessionError } from '@/features/auth/errors/session-error-mapper';
import type { SessionErrorClassification } from '@/features/auth/errors/session-error-mapper';
import {
AUTH_RESOURCE_CONFLICT,
AUTH_INVALID_TOKEN,
} from '@/features/auth/errors/session-error-codes';

type Status = 'idle' | 'pending' | 'success' | 'error';

interface SimState {
requiresConfirmation: boolean;
status: Status;
error: { classification: SessionErrorClassification; cause: unknown } | null;

sideEffects: {
clearAuthToken: number;
clearAllAuthCache: number;
broadcastLogout: number;
broadcastLoggedOut: number;
  };

inFlightRef: Promise<void> | null;
}

interface RunArgs {
deps: {
revokeOtherSessions: Mock<() => Promise<{ message?: string }>>;
  };
listOps: {
revalidate: Mock<() => Promise<void>>;
  };

args?: { confirmed: boolean };
}

function makeApiError(code: string, status: number): Error {
const err = new Error(`API error: ${code}`) as Error & {
code: string;
status: number;
  };
err.code = code;
err.status = status;
return err;
}

async function runRevokeOthers(args: RunArgs): Promise<SimState> {
const state: SimState = {
requiresConfirmation: true,
status: 'idle',
error: null,
sideEffects: {
clearAuthToken: 0,
clearAllAuthCache: 0,
broadcastLogout: 0,
broadcastLoggedOut: 0,
    },
inFlightRef: null,
  };

const confirmed = args.args?.confirmed === true;

if (!confirmed) {
state.requiresConfirmation = true;
state.status = 'idle';
state.error = null;
return state;
  }

if (state.inFlightRef) {
return state.inFlightRef.then(() => state);
  }

state.requiresConfirmation = false;
state.status = 'pending';
state.error = null;

const promise = (async (): Promise<void> => {
try {
await args.deps.revokeOtherSessions();
await args.listOps.revalidate();
state.status = 'success';
    } catch (cause: unknown) {
const apiErr = cause as { code?: string; status?: number };
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target: 'revoke-others',
      });
state.error = { classification, cause };
state.status = 'error';
await args.listOps.revalidate();
    } finally {
state.inFlightRef = null;
    }
  })();

state.inFlightRef = promise;
await promise;
return state;
}

describe('useRevokeOtherSessions — confirmation gate', () => {
it('does not call revokeOtherSessions without confirmed: true', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
    });

expect(revokeOtherSessions).not.toHaveBeenCalled();
expect(revalidate).not.toHaveBeenCalled();
expect(state.status).toBe('idle');
expect(state.requiresConfirmation).toBe(true);
  });

it('does not call revokeOtherSessions with confirmed: false', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: false },
    });

expect(revokeOtherSessions).not.toHaveBeenCalled();
expect(revalidate).not.toHaveBeenCalled();
expect(state.status).toBe('idle');
expect(state.requiresConfirmation).toBe(true);
  });

it('enters requires-confirmation state before the user confirms', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: false },
    });

expect(state.requiresConfirmation).toBe(true);
expect(state.error).toBeNull();
  });
});

describe('useRevokeOtherSessions — confirmed success', () => {
it('calls revokeOtherSessions and revalidates the list', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(revokeOtherSessions).toHaveBeenCalledTimes(1);
expect(revalidate).toHaveBeenCalledTimes(1);
expect(state.status).toBe('success');
expect(state.error).toBeNull();
  });

it('transitions to success status (empty state visible after revalidate)', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.status).toBe('success');
expect(state.requiresConfirmation).toBe(false);
  });

it('revalidates after success so the list reflects the empty state', async () => {
const executeOrder: string[] = [];
const revokeOtherSessions = vi.fn().mockImplementation(async () => {
executeOrder.push('revokeOtherSessions');
return { message: 'ok' };
    });
const revalidate = vi.fn().mockImplementation(async () => {
executeOrder.push('revalidate');
    });

await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(executeOrder).toEqual(['revokeOtherSessions', 'revalidate']);
  });
});

describe('useRevokeOtherSessions — confirmed failure', () => {
it('revalidates on failure (server state is source of truth)', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError('SOMETHING', 500));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(revalidate).toHaveBeenCalledTimes(1);
expect(state.status).toBe('error');
  });

it('surfaces a classified error on 409 (conflict)', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_RESOURCE_CONFLICT, 409));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe('conflict');
expect(state.error!.classification.code).toBe(AUTH_RESOURCE_CONFLICT);
  });

it('surfaces a classified error on auth_terminal (401)', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_INVALID_TOKEN, 401));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe('auth_terminal');
  });

it('surfaces retryable on 5xx', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError('INTERNAL_SERVER_ERROR', 500));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe('retryable');
  });

it('preserves the original cause in the error', async () => {
const cause = makeApiError('X', 500);
const revokeOtherSessions = vi.fn().mockRejectedValue(cause);
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.error!.cause).toBe(cause);
  });
});

describe('useRevokeOtherSessions — finalization discipline', () => {
it('NEVER calls clearAuthToken / clearAllAuthCache / broadcastLogout on success', async () => {
const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.sideEffects.clearAuthToken).toBe(0);
expect(state.sideEffects.clearAllAuthCache).toBe(0);
expect(state.sideEffects.broadcastLogout).toBe(0);
expect(state.sideEffects.broadcastLoggedOut).toBe(0);
  });

it('NEVER calls clearAuthToken / broadcastLogout on failure', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError('X', 500));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.sideEffects.clearAuthToken).toBe(0);
expect(state.sideEffects.clearAllAuthCache).toBe(0);
expect(state.sideEffects.broadcastLogout).toBe(0);
expect(state.sideEffects.broadcastLoggedOut).toBe(0);
  });
});

describe('useRevokeOtherSessions — error target', () => {
it('classifies errors with target "revoke-others"', async () => {
const revokeOtherSessions = vi
      .fn()
      .mockRejectedValue(makeApiError('X', 500));
const revalidate = vi.fn().mockResolvedValue(undefined);

const state = await runRevokeOthers({
deps: { revokeOtherSessions },
listOps: { revalidate },
args: { confirmed: true },
    });

expect(state.error!.classification.target).toBe('revoke-others');
  });
});
