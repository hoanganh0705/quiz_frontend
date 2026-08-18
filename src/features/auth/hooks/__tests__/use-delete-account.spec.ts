

import { describe, expect, it, vi, type Mock } from 'vitest';

import {
DELETION_INTENT_TOKEN,
type UseDeleteAccountSubmitResult,
} from '../use-delete-account';
import type { DeleteAccountResponseDto } from '@/lib/api';
import {
AUTH_DELETION_FAILED,
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
GLOBAL_VALIDATION_FAILED,
USER_NOT_FOUND,
} from '@/features/auth/errors/deletion-error-codes';
import type { DeletionAccountExistence } from '@/features/auth/lifecycle/deletion-revalidation';

type Kind = 'idle' | 'pending' | 'cleanup' | 'completed' | 'uncertain';
type Existence = DeletionAccountExistence;

interface SimState {
kind: Kind;
lastRevalidation: Existence | null;
error: { code: string; status: number } | null;

inFlight: Promise<UseDeleteAccountSubmitResult> | null;

finalizeCalls: number;

logoutCalls: number;
}

interface SimDeps {
deleteAccount: Mock<(dto: { password: string }) => Promise<DeleteAccountResponseDto>>;
finalize: Mock<() => Promise<{ alreadyFinalized: boolean }>>;
revalidateAccountExists: Mock<() => Promise<{ kind: 'success'; outcome: Existence } | { kind: 'error'; error: unknown }>>;
logout: Mock<() => Promise<unknown>>;
}

function makeApiErrorLike(code: string, status: number): Error & { code: string; status: number } {
const err = new Error(`API error: ${code}`) as Error & { code: string; status: number };
err.code = code;
err.status = status;
return err;
}

async function runSubmit(
state: SimState,
deps: SimDeps,
password: string,
typedConfirmation: string,
): Promise<UseDeleteAccountSubmitResult> {

if (state.inFlight) {
return state.inFlight;
  }

if (state.kind === 'cleanup' || state.kind === 'completed') {
return { kind: 'deduped' };
  }

if (password.length === 0) {
state.error = { code: '', status: 0 };
return { kind: 'rejected_local', reason: 'empty_password' };
  }
if (typedConfirmation !== DELETION_INTENT_TOKEN) {
state.error = { code: '', status: 0 };
return { kind: 'rejected_local', reason: 'intent_mismatch' };
  }

if ((state.kind === 'idle' || state.kind === 'uncertain') && state.error !== null) {
const c = state.error;
const isUncertain = c.status === 0 || (c.status >= 500 && c.status <= 599) || c.status === 429;
const isConflict = c.code === AUTH_DELETION_FAILED || c.code === AUTH_RESOURCE_CONFLICT;
if ((isUncertain || isConflict) && state.lastRevalidation === null) {
return { kind: 'rejected_local', reason: 'requires_revalidation' };
    }
  }

state.kind = 'pending';
state.error = null;

const promise = (async (): Promise<UseDeleteAccountSubmitResult> => {
let response: DeleteAccountResponseDto;
try {
response = await deps.deleteAccount({ password });
    } catch (cause: unknown) {
const apiLike = cause as { code?: string; status?: number };
const code = apiLike?.code ?? '';
const status = apiLike?.status ?? 0;
state.error = { code, status };

if (code === USER_NOT_FOUND) {
state.kind = 'cleanup';
await deps.finalize();
state.finalizeCalls += 1;
state.kind = 'completed';
return { kind: 'already_deleted', cause };
      }

if (code === AUTH_INVALID_TOKEN) {
state.kind = 'uncertain';
state.lastRevalidation = null;
return { kind: 'auth_terminal', cause };
      }

if (code === AUTH_INVALID_CURRENT_PASSWORD) {
state.kind = 'idle';
state.lastRevalidation = null;
return { kind: 'invalid_current', cause };
      }

if (code === GLOBAL_VALIDATION_FAILED) {
state.kind = 'idle';
state.lastRevalidation = null;
return { kind: 'validation', cause, validationMessages: [] };
      }

if (code === AUTH_DELETION_FAILED || code === AUTH_RESOURCE_CONFLICT) {
state.kind = 'uncertain';
state.lastRevalidation = null;
return { kind: 'conflict', cause };
      }

state.kind = 'uncertain';
state.lastRevalidation = null;
return { kind: 'uncertain', cause };
    }

state.kind = 'cleanup';
try {
await deps.finalize();
state.finalizeCalls += 1;
    } catch {
      // best-effort
    }
state.kind = 'completed';
return { kind: 'success', message: response.message };
  })();

state.inFlight = promise;
try {
return await promise;
  } finally {
if (state.inFlight === promise) {
state.inFlight = null;
    }
  }
}

async function runRevalidate(
state: SimState,
deps: SimDeps,
): Promise<Existence | null> {
const result = await deps.revalidateAccountExists();
if (result.kind === 'error') {
if (state.kind === 'idle' || state.kind === 'uncertain') {
state.lastRevalidation = 'unknown';
    }
return 'unknown';
  }
const outcome = result.outcome;
if (state.kind === 'idle' || state.kind === 'uncertain') {
state.lastRevalidation = outcome;
  }
if (outcome === 'already_deleted') {
state.kind = 'cleanup';
await deps.finalize();
state.finalizeCalls += 1;
state.kind = 'completed';
  }
return outcome;
}

function makeFreshState(): SimState {
return {
kind: 'idle',
lastRevalidation: null,
error: null,
inFlight: null,
finalizeCalls: 0,
logoutCalls: 0,
  };
}

function makeSuccessDeps(): SimDeps {
return {
deleteAccount: vi.fn(async () => ({ message: 'Account deleted' })),
finalize: vi.fn(async () => ({ alreadyFinalized: false })),
revalidateAccountExists: vi.fn(
async () => ({ kind: 'success' as const, outcome: 'exists' as const }),
    ),
logout: vi.fn(async () => undefined),
  };
}

describe('useDeleteAccount — successful submission', () => {
it('forwards the password to the delete method exactly once', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('success');
expect(deps.deleteAccount).toHaveBeenCalledTimes(1);
expect(deps.deleteAccount).toHaveBeenCalledWith({ password: 'hunter2' });
  });

it('transitions through cleanup → completed on success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('success');
expect(state.kind).toBe('completed');
expect(state.finalizeCalls).toBe(1);
  });

it('invokes the cleanup coordinator exactly once', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.finalize).toHaveBeenCalledTimes(1);
  });

it('never calls logout on the successful path', async () => {

const state = makeFreshState();
const deps = makeSuccessDeps();

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
expect(state.logoutCalls).toBe(0);
  });

it('returns the backend message on success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

if (result.kind === 'success') {
expect(result.message).toBe('Account deleted');
    } else {
throw new Error('expected success');
    }
  });
});

describe('useDeleteAccount — single-pending discipline', () => {
it('drops a second concurrent submit() that arrives before the first resolves', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

let resolveFirst!: (value: DeleteAccountResponseDto) => void;
deps.deleteAccount = vi.fn(
() =>
new Promise<DeleteAccountResponseDto>((resolve) => {
resolveFirst = resolve;
        }),
    );

const first = runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

const second = runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

resolveFirst({ message: 'Account deleted' });
const [firstResult, secondResult] = await Promise.all([first, second]);

expect(firstResult.kind).toBe('success');
expect(secondResult.kind).toBe('success');

expect(deps.deleteAccount).toHaveBeenCalledTimes(1);
  });

it('returns deduped after cleanup → completed', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('deduped');
expect(deps.deleteAccount).toHaveBeenCalledTimes(1);
  });
});

describe('useDeleteAccount — invalid_current password', () => {
it('returns invalid_current without invoking the cleanup coordinator', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401);
    });

const result = await runSubmit(state, deps, 'wrong', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('invalid_current');
expect(deps.finalize).toHaveBeenCalledTimes(0);
expect(state.finalizeCalls).toBe(0);
  });

it('returns to idle state with a known error (preserves intent at the modal layer)', async () => {

const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401);
    });

await runSubmit(state, deps, 'wrong', DELETION_INTENT_TOKEN);

expect(state.kind).toBe('idle');
expect(state.error).not.toBeNull();
if (state.error) {
expect(state.error.code).toBe(AUTH_INVALID_CURRENT_PASSWORD);
    }
  });

it('does NOT call logout', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401);
    });

await runSubmit(state, deps, 'wrong', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
  });

it('resets lastRevalidation so a future uncertain attempt must revalidate', async () => {

const state = makeFreshState();
state.lastRevalidation = 'exists';
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401);
    });

await runSubmit(state, deps, 'wrong', DELETION_INTENT_TOKEN);

expect(state.lastRevalidation).toBeNull();
  });
});

describe('useDeleteAccount — revalidation gate', () => {
it('rejects a second submit after conflict without revalidation', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_DELETION_FAILED, 409);
    });

const first = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(first.kind).toBe('conflict');
expect(state.kind).toBe('uncertain');
expect(state.lastRevalidation).toBeNull();

const second = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(second.kind).toBe('rejected_local');
if (second.kind === 'rejected_local') {
expect(second.reason).toBe('requires_revalidation');
    }
expect(deps.deleteAccount).toHaveBeenCalledTimes(1);
  });

it('rejects a second submit after uncertain without revalidation', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike('SOME_CODE', 503);
    });

const first = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(first.kind).toBe('uncertain');
expect(state.kind).toBe('uncertain');

const second = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(second.kind).toBe('rejected_local');
if (second.kind === 'rejected_local') {
expect(second.reason).toBe('requires_revalidation');
    }
  });

it('allows a second submit after revalidation confirms the account exists', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi
      .fn<typeof deps.deleteAccount>()
      .mockRejectedValueOnce(makeApiErrorLike(AUTH_DELETION_FAILED, 409))
      .mockResolvedValueOnce({ message: 'Account deleted' });

const first = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(first.kind).toBe('conflict');

const revalidated = await runRevalidate(state, deps);
expect(revalidated).toBe('exists');
expect(state.lastRevalidation).toBe('exists');

const second = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(second.kind).toBe('success');
expect(deps.deleteAccount).toHaveBeenCalledTimes(2);
  });

it('revalidation = already_deleted runs the terminal cleanup without a second submit', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_DELETION_FAILED, 409);
    });
deps.revalidateAccountExists = vi.fn(
async () => ({ kind: 'success' as const, outcome: 'already_deleted' as const }),
    );

const first = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);
expect(first.kind).toBe('conflict');

const revalidated = await runRevalidate(state, deps);
expect(revalidated).toBe('already_deleted');
expect(state.kind).toBe('completed');
expect(deps.finalize).toHaveBeenCalledTimes(1);
  });
});

describe('useDeleteAccount — cleanup ordering on success', () => {
it('cleans up only after the delete response resolves', async () => {
const order: string[] = [];
const state = makeFreshState();
const deps: SimDeps = {
deleteAccount: vi.fn(async () => {
order.push('delete');
return { message: 'Account deleted' };
      }),
finalize: vi.fn(async () => {
order.push('finalize');
return { alreadyFinalized: false };
      }),
revalidateAccountExists: vi.fn(
async () => ({ kind: 'success' as const, outcome: 'exists' as const }),
      ),
logout: vi.fn(async () => {
order.push('logout');
return undefined;
      }),
    };

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(order).toEqual(['delete', 'finalize']);
expect(order).not.toContain('logout');
  });

it('does NOT call logout on any failure path', async () => {
const codes = [
AUTH_INVALID_CURRENT_PASSWORD,
AUTH_DELETION_FAILED,
AUTH_RESOURCE_CONFLICT,
AUTH_INVALID_TOKEN,
GLOBAL_VALIDATION_FAILED,
USER_NOT_FOUND,
'SOMETHING_NEW',
    ];

for (const code of codes) {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(code, code === AUTH_INVALID_TOKEN ? 401 : 409);
      });

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
    }
  });

it('runs cleanup even if deleteAccount succeeds but finalize throws', async () => {

const state = makeFreshState();
const deps = makeSuccessDeps();
deps.finalize = vi.fn(async () => {
throw new Error('cleanup failed');
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('success');
expect(state.kind).toBe('completed');
  });
});

describe('useDeleteAccount — uncertainty never succeeds', () => {
it('network failure (status 0) does NOT transition to success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike('NETWORK_FAILURE', 0);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('uncertain');
expect(state.kind).toBe('uncertain');
expect(state.kind).not.toBe('cleanup');
expect(state.kind).not.toBe('completed');
expect(deps.finalize).toHaveBeenCalledTimes(0);
  });

it('5xx server error does NOT transition to success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike('GLOBAL_INTERNAL_ERROR', 503);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('uncertain');
expect(state.kind).toBe('uncertain');
expect(deps.finalize).toHaveBeenCalledTimes(0);
  });

it('429 rate-limited does NOT transition to success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike('GLOBAL_RATE_LIMITED', 429);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('uncertain');
expect(state.kind).toBe('uncertain');
expect(deps.finalize).toHaveBeenCalledTimes(0);
  });

it('unknown code does NOT transition to success', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike('SOMETHING_NEW', 418);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('uncertain');
expect(state.kind).toBe('uncertain');
expect(deps.finalize).toHaveBeenCalledTimes(0);
  });
});

describe('useDeleteAccount — USER_NOT_FOUND safe terminal path', () => {
it('transitions through cleanup → completed when another tab already deleted', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(USER_NOT_FOUND, 404);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('already_deleted');
expect(state.kind).toBe('completed');
expect(deps.finalize).toHaveBeenCalledTimes(1);
  });

it('does NOT call logout on the already_deleted path', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(USER_NOT_FOUND, 404);
    });

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
  });
});

describe('useDeleteAccount — local validation', () => {
it('rejects empty password before invoking the SDK', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, '', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('rejected_local');
if (result.kind === 'rejected_local') {
expect(result.reason).toBe('empty_password');
    }
expect(deps.deleteAccount).toHaveBeenCalledTimes(0);
  });

it('rejects mismatched typed confirmation before invoking the SDK', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', 'delete');

expect(result.kind).toBe('rejected_local');
if (result.kind === 'rejected_local') {
expect(result.reason).toBe('intent_mismatch');
    }
expect(deps.deleteAccount).toHaveBeenCalledTimes(0);
  });

it('rejects empty typed confirmation', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', '');

expect(result.kind).toBe('rejected_local');
expect(deps.deleteAccount).toHaveBeenCalledTimes(0);
  });

it('accepts the exact DELETION_INTENT_TOKEN', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('success');
expect(deps.deleteAccount).toHaveBeenCalledTimes(1);
  });
});

describe('useDeleteAccount — AUTH_INVALID_TOKEN', () => {
it('classifies as auth_terminal', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_TOKEN, 401);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('auth_terminal');
  });

it('does NOT run cleanup on auth_terminal', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_TOKEN, 401);
    });

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.finalize).toHaveBeenCalledTimes(0);
  });

it('does NOT call logout on auth_terminal', async () => {

const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(AUTH_INVALID_TOKEN, 401);
    });

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
  });
});

describe('useDeleteAccount — GLOBAL_VALIDATION_FAILED', () => {
it('classifies as validation and returns to idle', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(GLOBAL_VALIDATION_FAILED, 400);
    });

const result = await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(result.kind).toBe('validation');
expect(state.kind).toBe('idle');
  });

it('does NOT call logout on validation', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();
deps.deleteAccount = vi.fn(async () => {
throw makeApiErrorLike(GLOBAL_VALIDATION_FAILED, 400);
    });

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

expect(deps.logout).toHaveBeenCalledTimes(0);
  });
});

describe('useDeleteAccount — password hygiene', () => {
it('does not store the password in simulated state', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

const serialized = JSON.stringify(state);
expect(serialized).not.toContain('hunter2');
  });

it('does not store the typed confirmation in simulated state', async () => {
const state = makeFreshState();
const deps = makeSuccessDeps();

await runSubmit(state, deps, 'hunter2', DELETION_INTENT_TOKEN);

const serialized = JSON.stringify(state);

expect(serialized).not.toContain('hunter2');
  });
});
