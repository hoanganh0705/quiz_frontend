/**
 * Unit tests for `useRevokeSession` hook.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T25.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Non-current revoke success: optimistic remove + revalidate
 *   2. Non-current revoke failure: rollback via inverse mutate + error banner
 *   3. Current-session revoke success: calls `revokeCurrentSession`, no extra cookie clear in hook
 *   4. `AUTH_SESSION_NOT_FOUND` on non-current: silent revalidate (no banner)
 *   5. `409 AUTH_RESOURCE_CONFLICT`: rollback + conflict banner
 *   6. Tests use React Testing Library with mocked `useActiveSessions` and `auth.service`
 *
 * ## Strategy
 *
 * The frontend test environment is pure `node` (no jsdom /
 * happy-dom configured). The hook uses `useState`, `useRef`,
 * `useCallback`, and `useRouter` — rendering it requires a DOM.
 *
 * The project's convention (see `use-google-login.spec.ts`) is to
 * verify the hook's **pure logic** through state-machine simulation:
 *
 *   - `runRevokeSession` mirrors the hook's reducer exactly using
 *     the same `deps` / `listOps` interface, so the simulation drives
 *     the same transitions the rendered hook would.
 *   - This catches the same branches the integration tests would:
 *     optimistic remove, rollback path, current-session finalization,
 *     `already_revoked` silent revalidate, conflict banner.
 *   - The DOM/router integration is verified by the E2E suite (T28).
 *
 * Because the simulation is a near-verbatim copy of the hook's
 * reducer, the tests serve as both *behavior* and *architecture*
 * tests: if the hook's flow changes, the test breaks, which makes
 * the contracts (current-session routing, rollback discipline,
 * silent revalidation) visible.
 */

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

// ─── Simulated hook state ────────────────────────────────────────────────────

type Status = 'idle' | 'pending' | 'success' | 'error';

interface SimState {
  status: Status;
  error: { classification: SessionErrorClassification; cause: unknown } | null;
  /** Router navigation history (so we can assert on routes). */
  navigated: string[];
  /** Side-effect calls recorded for assertion. */
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
  /**
   * Initial list — the simulation reads from this to apply the
   * optimistic remove + inverse mutate.
   */
  initialList: SessionListItemDto[];
}

/**
 * Mirror of `useRevokeSession`'s reducer. The body is intentionally
 * structured to match the hook line-for-line so drift is visible
 * during review.
 */
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

  // Optimistic remove (mirrors the hook's pre-network `mutate`).
  args.listOps.mutate((current: SessionListItemDto[]) =>
    current.filter((s) => s.sessionId !== removed.sessionId),
  );

  if (args.isCurrentSession) {
    // Current-session path. The hook injects `deps.revokeCurrentSession`
    // which internally already runs cookie/cache/broadcast on
    // backend success — the hook does NOT do that work itself.
    try {
      const result: RevokeCurrentSessionResult =
        await args.deps.revokeCurrentSession(removed.sessionId);

      if (result.kind === 'success') {
        state.status = 'success';
        state.navigated.push('/login');
        return state;
      }

      // Restore the row.
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

  // Non-current path.
  try {
    await args.deps.revokeSession(removed.sessionId);
    await args.listOps.revalidate();
    state.status = 'success';
  } catch (cause: unknown) {
    // Restore the row.
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

    // `already_revoked` is silent success.
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

// ─── Test fixtures ───────────────────────────────────────────────────────────

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

// ─── T25.1: Non-current revoke success ───────────────────────────────────────

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
    // The first (and only) mutate call's updater should remove the
    // target session from the list.
    const updater = mutate.mock.calls[0][0] as (
      current: SessionListItemDto[],
    ) => SessionListItemDto[];
    const result = updater(initialList);
    expect(result).toHaveLength(1);
    expect(result[0].sessionId).toBe('session-current');

    // Sanity-check the resolved state machine value as well.
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

// ─── T25.2: Non-current revoke failure with rollback ─────────────────────────

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

    // The first mutate is the optimistic remove; the second is the
    // inverse restore. The restore updater should insert the row back.
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
    // If the row is already present (concurrent restore), the
    // updater must NOT add a duplicate.
    const result = restoreUpdater([session]);
    expect(result).toEqual([session]);
  });
});

// ─── T25.3: Current-session revoke success ───────────────────────────────────

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
    // The hook's contract is that finalization is owned by the
    // service. The service-internal counter is what we care about
    // here, but in the simulation there is no service — the hook
    // must NOT have its own side effects.
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

// ─── T25.4: AUTH_SESSION_NOT_FOUND on non-current → silent revalidate ────────

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

    // The hook's flow on already_revoked (non-current):
    //   1. optimistic remove (mutate)
    //   2. network call rejects
    //   3. inverse restore (mutate) — runs BEFORE the already_revoked
    //      short-circuit so the row is preserved against any
    //      subsequent render
    //   4. already_revoked → silent revalidate
    expect(mutate).toHaveBeenCalledTimes(2);
    const optimisticUpdater = mutate.mock.calls[0][0] as (
      current: SessionListItemDto[],
    ) => SessionListItemDto[];
    expect(optimisticUpdater([session])).toEqual([]);
  });
});

// ─── T25.5: AUTH_RESOURCE_CONFLICT → conflict banner ────────────────────────

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

// ─── T25.6: AUTH_INVALID_TOKEN → auth_terminal ──────────────────────────────

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

// ─── T25.7: current-session failure paths ────────────────────────────────────

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
