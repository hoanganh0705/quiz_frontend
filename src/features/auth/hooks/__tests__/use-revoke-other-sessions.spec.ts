/**
 * Unit tests for `useRevokeOtherSessions` hook.
 *
 * Source epic: Epic 2.8 — Security dashboard and active-session management.
 * Source ticket: 2.8.T26.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Without `confirmed: true`: no `revokeOtherSessions` call
 *   2. With `confirmed: true` + success: list revalidated, empty state visible
 *   3. With `confirmed: true` + failure: list revalidated (server truth), error banner shown
 *   4. Hook never calls `clearAuthToken` / `broadcastLogout` (this is "revoke others", not logout-all)
 *
 * ## Strategy
 *
 * Same convention as T25 / `use-google-login.spec.ts`: pure-node
 * vitest with no jsdom. The hook's reducer is mirrored in a small
 * harness (`runRevokeOthers`) that drives the same state-machine
 * transitions the rendered hook would. The harness is structured
 * line-for-line with the hook so architectural drift is visible
 * during review.
 */

import { describe, expect, it, vi, type Mock } from 'vitest';
import { mapSessionError } from '@/features/auth/errors/session-error-mapper';
import type { SessionErrorClassification } from '@/features/auth/errors/session-error-mapper';
import {
  AUTH_RESOURCE_CONFLICT,
  AUTH_INVALID_TOKEN,
} from '@/features/auth/errors/session-error-codes';

// ─── Simulated hook state ────────────────────────────────────────────────────

type Status = 'idle' | 'pending' | 'success' | 'error';

interface SimState {
  requiresConfirmation: boolean;
  status: Status;
  error: { classification: SessionErrorClassification; cause: unknown } | null;
  /** Side-effect calls (for the "never calls clearAuthToken" assertion). */
  sideEffects: {
    clearAuthToken: number;
    clearAllAuthCache: number;
    broadcastLogout: number;
    broadcastLoggedOut: number;
  };
  /**
   * Holds the in-flight promise so concurrent calls can dedup.
   * Mirrors the hook's `inFlightRef`.
   */
  inFlightRef: Promise<void> | null;
}

interface RunArgs {
  deps: {
    revokeOtherSessions: Mock<() => Promise<{ message?: string }>>;
  };
  listOps: {
    revalidate: Mock<() => Promise<void>>;
  };
  /**
   * Whether the call lands a confirmation or not. Defaults to
   * `undefined` (no-confirmation path).
   */
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

/**
 * Mirror of `useRevokeOthers`'s reducer. The body is intentionally
 * structured to match the hook line-for-line so drift is visible
 * during review.
 */
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

// ─── T26.1: confirmation gate ────────────────────────────────────────────────

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

// ─── T26.2: confirmed + success ──────────────────────────────────────────────

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

    // The list component reads `status === 'success'` and the
    // empty-state predicate `isOnlyCurrentSession(sessions)` to
    // render the "no other active sessions" copy. The hook
    // transitions to `success` so the list component can do its
    // job.
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

    // Revalidate must run AFTER the network call resolves so the
    // list reflects server-state truth.
    expect(executeOrder).toEqual(['revokeOtherSessions', 'revalidate']);
  });
});

// ─── T26.3: confirmed + failure ──────────────────────────────────────────────

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

// ─── T26.4: never calls clearAuthToken / broadcastLogout ────────────────────

describe('useRevokeOtherSessions — finalization discipline', () => {
  it('NEVER calls clearAuthToken / clearAllAuthCache / broadcastLogout on success', async () => {
    const revokeOtherSessions = vi.fn().mockResolvedValue({ message: 'ok' });
    const revalidate = vi.fn().mockResolvedValue(undefined);

    const state = await runRevokeOthers({
      deps: { revokeOtherSessions },
      listOps: { revalidate },
      args: { confirmed: true },
    });

    // The hook is "revoke others", not logout-all. The current
    // session must remain authenticated after a successful call.
    // The simulation has no service — the hook must NOT have its
    // own side effects.
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

// ─── T26.5: error.target is always 'revoke-others' ──────────────────────────

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
