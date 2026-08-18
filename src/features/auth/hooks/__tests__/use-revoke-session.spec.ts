

import { describe, expect, it, vi, type Mock } from 'vitest';
import { mapSessionError } from '@/features/auth/errors/session-error-mapper';
import type { SessionErrorClassification } from '@/features/auth/errors/session-error-mapper';
import {
AUTH_SESSION_NOT_FOUND,
AUTH_INVALID_TOKEN,
AUTH_RESOURCE_CONFLICT,
} from '@/features/auth/errors/session-error-codes';
import type { SessionListItemDto } from '@/lib/api';
import type { RevokeCurrentSessionResult } from '@/features/auth/services/auth.service';

type Status = 'idle' | 'pending' | 'success' | 'error';

interface SimState {
status: Status;
error: { classification: SessionErrorClassification; cause: unknown } | null;

navigated: string[];

sideEffects: {
clearAuthToken: number;
clearAllAuthCache: number;
broadcastLogout: number;
  };
}

interface RunArgs {
session: SessionListItemDto;
isCurrentSession: boolean;
deps: {
revokeSession: Mock<(sessionId: string) => Promise<{ message?: string }>>;
revokeCurrentSession: Mock<(sessionId: string) => Promise<RevokeCurrentSessionResult>>;
  };
listOps: {
mutate: Mock<(updater: (current: SessionListItemDto[]) => SessionListItemDto[]) => void>;
revalidate: Mock<() => Promise<void>>;
  };

initialList: SessionListItemDto[];
}

async function runRevokeSession(
args: RunArgs,
): Promise<SimState> {
const state: SimState = {
status: 'idle',
error: null,
navigated: [],
sideEffects: {
clearAuthToken: 0,
clearAllAuthCache: 0,
broadcastLogout: 0,
    },
  };

const target: 'self' | 'other' = args.isCurrentSession ? 'self' : 'other';
const removed = args.session;

state.status = 'pending';

args.listOps.mutate((current: SessionListItemDto[]) =>
current.filter((s) => s.sessionId !== removed.sessionId),
  );

if (args.isCurrentSession) {

try {
const result: RevokeCurrentSessionResult =
await args.deps.revokeCurrentSession(removed.sessionId);

if (result.kind === 'success') {
state.status = 'success';
state.navigated.push('/login');
return state;
      }

args.listOps.mutate((current: SessionListItemDto[]) =>
current.some((s) => s.sessionId === removed.sessionId)
? current
: [...current, removed],
      );
const classification = mapSessionError({
code: result.error.code,
status: result.error.status,
target,
      });
state.error = { classification, cause: result.error };
state.status = 'error';
if (classification.kind === 'current_revoked') {
state.navigated.push('/login');
      }
    } catch (cause: unknown) {
args.listOps.mutate((current: SessionListItemDto[]) =>
current.some((s) => s.sessionId === removed.sessionId)
? current
: [...current, removed],
      );
const apiErr = cause as { code?: string; status?: number };
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target,
      });
state.error = { classification, cause };
state.status = 'error';
if (classification.kind === 'current_revoked') {
state.navigated.push('/login');
      }
    }
return state;
  }

try {
await args.deps.revokeSession(removed.sessionId);
await args.listOps.revalidate();
state.status = 'success';
  } catch (cause: unknown) {

args.listOps.mutate((current: SessionListItemDto[]) =>
current.some((s) => s.sessionId === removed.sessionId)
? current
: [...current, removed],
    );
const apiErr = cause as { code?: string; status?: number };
const classification = mapSessionError({
code: apiErr?.code ?? 'UNKNOWN',
status: apiErr?.status ?? 0,
target,
    });

if (classification.kind === 'already_revoked') {
await args.listOps.revalidate();
state.status = 'success';
return state;
    }

state.error = { classification, cause };
state.status = 'error';
  }
return state;
}

function makeSession(): SessionListItemDto {
return {
sessionId: 'session-abc',
deviceBrowser: 'Chrome',
deviceOs: 'macOS',
deviceType: 'desktop',
ipAddress: '10.0.0.1',
lastActiveAt: '2026-07-31T10:00:00.000Z',
isCurrentSession: false,
  };
}

function makeCurrentSession(): SessionListItemDto {
return {
sessionId: 'session-current',
deviceBrowser: 'Firefox',
deviceOs: 'Linux',
deviceType: 'desktop',
ipAddress: '10.0.0.2',
lastActiveAt: '2026-07-31T11:00:00.000Z',
isCurrentSession: true,
  };
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

describe('useRevokeSession — non-current revoke success', () => {
it('optimistically removes the row before the network call', async () => {
const session = makeSession();
const initialList = [session, makeCurrentSession()];

const mutate = vi.fn();
const revalidate = vi.fn().mockResolvedValue(undefined);
const revokeSession = vi.fn().mockResolvedValue({ message: 'ok' });

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: { mutate, revalidate },
initialList,
    });

expect(mutate).toHaveBeenCalledTimes(1);

const updater = mutate.mock.calls[0][0] as (
current: SessionListItemDto[],
    ) => SessionListItemDto[];
const result = updater(initialList);
expect(result).toHaveLength(1);
expect(result[0].sessionId).toBe('session-current');

expect(state.status).toBe('success');
expect(state.error).toBeNull();
  });

it('revalidates the list after success', async () => {
const session = makeSession();
const revalidate = vi.fn().mockResolvedValue(undefined);
const revokeSession = vi.fn().mockResolvedValue({ message: 'ok' });

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: { mutate: vi.fn(), revalidate },
initialList: [session],
    });

expect(revalidate).toHaveBeenCalledTimes(1);
expect(state.status).toBe('success');
expect(state.error).toBeNull();
  });

it('does not navigate to /login on non-current success', async () => {
const session = makeSession();
const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: {
revokeSession: vi.fn().mockResolvedValue({ message: 'ok' }),
revokeCurrentSession: vi.fn(),
      },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.navigated).toEqual([]);
  });

it('invokes revokeSession with the row sessionId', async () => {
const session = makeSession();
const revokeSession = vi.fn().mockResolvedValue({ message: 'ok' });

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(revokeSession).toHaveBeenCalledTimes(1);
expect(revokeSession).toHaveBeenCalledWith('session-abc');
  });
});

describe('useRevokeSession — non-current revoke failure (rollback)', () => {
it('restores the row via inverse mutate on a retryable failure', async () => {
const session = makeSession();
const mutate = vi.fn();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError('SOMETHING', 500));

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('error');
expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe('retryable');

expect(mutate).toHaveBeenCalledTimes(2);
const restoreUpdater = mutate.mock.calls[1][0] as (
current: SessionListItemDto[],
    ) => SessionListItemDto[];
const restored = restoreUpdater([]);
expect(restored).toEqual([session]);
  });

it('does not revalidate on retryable failure (idempotent local state)', async () => {
const session = makeSession();
const revalidate = vi.fn().mockResolvedValue(undefined);
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError('SOMETHING', 500));

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate: vi.fn(),
revalidate,
      },
initialList: [session],
    });

expect(revalidate).not.toHaveBeenCalled();
  });

it('restore is idempotent if the row already exists', async () => {
const session = makeSession();
const mutate = vi.fn();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError('SOMETHING', 500));

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

const restoreUpdater = mutate.mock.calls[1][0] as (
current: SessionListItemDto[],
    ) => SessionListItemDto[];

const result = restoreUpdater([session]);
expect(result).toEqual([session]);
  });
});

describe('useRevokeSession — current-session revoke success', () => {
it('routes through revokeCurrentSession, not revokeSession', async () => {
const session = makeCurrentSession();
const revokeCurrentSession = vi.fn().mockResolvedValue({
kind: 'success',
message: 'ok',
    });

const state = await runRevokeSession({
session,
isCurrentSession: true,
deps: {
revokeSession: vi.fn(),
revokeCurrentSession,
      },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(revokeCurrentSession).toHaveBeenCalledTimes(1);
expect(revokeCurrentSession).toHaveBeenCalledWith('session-current');
expect(state.status).toBe('success');
  });

it('navigates to /login on success', async () => {
const session = makeCurrentSession();
const state = await runRevokeSession({
session,
isCurrentSession: true,
deps: {
revokeSession: vi.fn(),
revokeCurrentSession: vi.fn().mockResolvedValue({
kind: 'success',
message: 'ok',
        }),
      },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.navigated).toEqual(['/login']);
  });

it('does NOT call clearAuthToken / clearAllAuthCache / broadcastLogout in the hook (those live in the service)', async () => {

const session = makeCurrentSession();
const state = await runRevokeSession({
session,
isCurrentSession: true,
deps: {
revokeSession: vi.fn(),
revokeCurrentSession: vi.fn().mockResolvedValue({
kind: 'success',
message: 'ok',
        }),
      },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.sideEffects.clearAuthToken).toBe(0);
expect(state.sideEffects.clearAllAuthCache).toBe(0);
expect(state.sideEffects.broadcastLogout).toBe(0);
  });
});

describe('useRevokeSession — AUTH_SESSION_NOT_FOUND silent revalidate', () => {
it('treats AUTH_SESSION_NOT_FOUND on non-current as success-after-revalidate', async () => {
const session = makeSession();
const revalidate = vi.fn().mockResolvedValue(undefined);
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_SESSION_NOT_FOUND, 404));

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: { mutate: vi.fn(), revalidate },
initialList: [session],
    });

expect(state.status).toBe('success');
expect(state.error).toBeNull();
expect(revalidate).toHaveBeenCalledTimes(1);
  });

it('does NOT surface an error banner for already_revoked', async () => {
const session = makeSession();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_SESSION_NOT_FOUND, 404));

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('success');
expect(state.error).toBeNull();
  });

it('still runs the optimistic remove on already_revoked (row is gone server-side)', async () => {
const session = makeSession();
const mutate = vi.fn();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_SESSION_NOT_FOUND, 404));

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(mutate).toHaveBeenCalledTimes(2);
const optimisticUpdater = mutate.mock.calls[0][0] as (
current: SessionListItemDto[],
    ) => SessionListItemDto[];
expect(optimisticUpdater([session])).toEqual([]);
  });
});

describe('useRevokeSession — AUTH_RESOURCE_CONFLICT rollback + conflict banner', () => {
it('classifies 409 as conflict and sets error state', async () => {
const session = makeSession();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_RESOURCE_CONFLICT, 409));

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('error');
expect(state.error).not.toBeNull();
expect(state.error!.classification.kind).toBe('conflict');
expect(state.error!.classification.code).toBe(AUTH_RESOURCE_CONFLICT);
  });

it('restores the row on 409', async () => {
const session = makeSession();
const mutate = vi.fn();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_RESOURCE_CONFLICT, 409));

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(mutate).toHaveBeenCalledTimes(2);
const restoreUpdater = mutate.mock.calls[1][0] as (
current: SessionListItemDto[],
    ) => SessionListItemDto[];
expect(restoreUpdater([])).toEqual([session]);
  });
});

describe('useRevokeSession — AUTH_INVALID_TOKEN', () => {
it('classifies AUTH_INVALID_TOKEN as auth_terminal', async () => {
const session = makeSession();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_INVALID_TOKEN, 401));

const state = await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('error');
expect(state.error!.classification.kind).toBe('auth_terminal');
  });

it('restores the row on auth_terminal (terminal-clear path is owned by the refresh interceptor)', async () => {
const session = makeSession();
const mutate = vi.fn();
const revokeSession = vi
      .fn()
      .mockRejectedValue(makeApiError(AUTH_INVALID_TOKEN, 401));

await runRevokeSession({
session,
isCurrentSession: false,
deps: { revokeSession, revokeCurrentSession: vi.fn() },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(mutate).toHaveBeenCalledTimes(2);
  });
});

describe('useRevokeSession — current-session failure', () => {
it('restores the row and surfaces error on current-session failure', async () => {
const session = makeCurrentSession();
const mutate = vi.fn();
const revokeCurrentSession = vi.fn().mockResolvedValue({
kind: 'error',
error: makeApiError(AUTH_RESOURCE_CONFLICT, 409),
    });

const state = await runRevokeSession({
session,
isCurrentSession: true,
deps: {
revokeSession: vi.fn(),
revokeCurrentSession,
      },
listOps: {
mutate,
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('error');
expect(state.error!.classification.kind).toBe('conflict');
expect(mutate).toHaveBeenCalledTimes(2);
  });

it('navigates to /login on current_revoked (current-session detected as gone server-side)', async () => {
const session = makeCurrentSession();
const revokeCurrentSession = vi.fn().mockResolvedValue({
kind: 'error',
error: makeApiError(AUTH_SESSION_NOT_FOUND, 404),
    });

const state = await runRevokeSession({
session,
isCurrentSession: true,
deps: {
revokeSession: vi.fn(),
revokeCurrentSession,
      },
listOps: {
mutate: vi.fn(),
revalidate: vi.fn().mockResolvedValue(undefined),
      },
initialList: [session],
    });

expect(state.status).toBe('error');
expect(state.error!.classification.kind).toBe('current_revoked');
expect(state.navigated).toEqual(['/login']);
  });
});
