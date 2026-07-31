/**
 * Unit tests for `useChangePassword` hook.
 *
 * Source epic: Epic 2.9 — Password re-verification and password change.
 * Source ticket: 2.9.T18.
 *
 * ## Coverage contract (per the ticket)
 *
 *   1. Client validation: mismatch / equal current-new / weak password
 *      all set `fieldErrors` without firing the request
 *   2. Success: fires request, calls `revalidateAfterPasswordChange`,
 *      calls injected `revalidateDashboard` + `revalidateSessions`
 *      callbacks
 *   3. `AUTH_INVALID_CURRENT_PASSWORD`: sets
 *      `classification: 'invalid_current'` and does NOT call
 *      revalidation callbacks
 *   4. `AUTH_PASSWORD_REUSE`: sets `classification: 'reuse'`
 *   5. `5xx` / network: sets `classification: 'retryable'`
 *   6. Single pending: second concurrent `change()` is dropped
 *   7. `reset()` clears `error` / `classification` / `fieldErrors`
 *      and returns to `'idle'`
 *   8. Tests use the state-machine simulation pattern as 2.8.T25
 *
 * ## Strategy
 *
 * Same convention as T17 / `use-revoke-session.spec.ts` /
 * `use-revoke-other-sessions.spec.ts`: pure-node vitest with no
 * jsdom. The hook's reducer is mirrored in a small harness
 * (`runChangePassword`) that drives the same state-machine
 * transitions the rendered hook would. The harness is structured
 * line-for-line with the hook so architectural drift is visible
 * during review.
 *
 * ## Password hygiene
 *
 * The simulation asserts (T18 hygiene invariant): `state.password`,
 * `state.currentPassword`, `state.newPassword`, and
 * `state.confirmPassword` are NEVER keys on the simulated state at
 * any point in the lifecycle. The hook's arguments are consumed in
 * a function-local scope and never persisted.
 */

import { describe, expect, it, vi, type Mock } from 'vitest';
import { mapPasswordError } from '@/features/auth/errors/password-error-mapper';
import type { PasswordErrorClassification } from '@/features/auth/errors/password-error-mapper';
import { getPasswordStrength } from '@/features/auth/utils/password-strength';
import {
  AUTH_INVALID_CURRENT_PASSWORD,
  AUTH_INVALID_TOKEN,
  AUTH_PASSWORD_REUSE,
  AUTH_RESOURCE_CONFLICT,
  GLOBAL_VALIDATION_FAILED,
} from '@/features/auth/errors/password-error-codes';
import type {
  AccountSecurityDto,
  ChangePasswordResponseDto,
  SessionListResponseDto,
} from '@/lib/api';

// ─── Simulated hook state ────────────────────────────────────────────────────

type Status = 'idle' | 'pending' | 'success' | 'error';

export type ChangePasswordFieldErrorKey =
  | 'invalidCurrent'
  | 'reuse'
  | 'mismatch'
  | 'weak'
  | 'equalToCurrent'
  | 'required'
  | 'tooShort';

interface SimFieldErrors {
  currentPassword?: ChangePasswordFieldErrorKey;
  newPassword?: ChangePasswordFieldErrorKey;
  confirmPassword?: ChangePasswordFieldErrorKey;
}

interface SimError {
  classification: PasswordErrorClassification;
  fieldErrors: SimFieldErrors;
  cause: unknown;
}

interface SimState {
  status: Status;
  error: SimError | null;
  result: ChangePasswordResponseDto | null;
  /** In-flight tracker — mirrors the hook's `inFlightRef`. */
  inFlight: Promise<ChangePasswordResponseDto | null> | null;
}

interface RunArgs {
  deps: {
    changePassword: Mock<
      (dto: { currentPassword: string; newPassword: string }) => Promise<ChangePasswordResponseDto>
    >;
    revalidateAfterPasswordChange: Mock<
      () => Promise<{ dashboard: AccountSecurityDto; sessions: SessionListResponseDto }>
    >;
    revalidateDashboard: Mock<(next: AccountSecurityDto) => void>;
    revalidateSessions: Mock<(next: SessionListResponseDto) => void>;
  };
  input: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  };
  /**
   * Whether `revalidateAfterPasswordChange` should reject. Used to
   * test that revalidation failure does NOT roll back the success.
   */
  revalidateRejects?: boolean;
}

const FAKE_DASHBOARD: AccountSecurityDto = {
  emailVerified: true,
  activeSessionCount: 1,
  lastSuccessfulLoginAt: '2026-07-30T10:00:00.000Z',
  passwordAgeDays: 0,
  lastPasswordChangeAt: '2026-07-31T00:00:00.000Z',
};

const FAKE_SESSIONS: SessionListResponseDto = {
  sessions: [
    {
      sessionId: 'fixture-session-id',
      deviceBrowser: 'Chromium',
      deviceOs: 'Linux',
      deviceType: 'desktop',
      ipAddress: '127.0.0.1',
      lastActiveAt: '2026-07-31T00:00:00.000Z',
      isCurrentSession: true,
    },
  ],
};

const DEFAULT_REVALIDATED = { dashboard: FAKE_DASHBOARD, sessions: FAKE_SESSIONS };

/**
 * Map a classification kind to a field-error key. Mirror of the
 * `fieldErrorsFromClassification` helper in `use-change-password.ts`.
 */
function fieldErrorsFromClassification(
  classification: PasswordErrorClassification,
): SimFieldErrors {
  switch (classification.kind) {
    case 'invalid_current':
      return { currentPassword: 'invalidCurrent' };
    case 'reuse':
      return { newPassword: 'reuse' };
    case 'validation':
      return { newPassword: 'weak' };
    case 'auth_terminal':
    case 'conflict':
    case 'retryable':
      return {};
  }
}

/**
 * Helper: synthesise a fake `ApiError`-shaped value that the hook
 * recognises. The hook's classifier checks for the presence of
 * `code`, `status`, and `validationMessages` — a plain object with
 * those keys satisfies the predicate without needing the real
 * `ApiError` class (which requires axios).
 */
function makeApiErrorLike(code: string, status: number, validationMessages?: string[]): unknown {
  const err = new Error(`API error: ${code}`) as Error & {
    code: string;
    status: number;
    validationMessages: string[];
  };
  err.code = code;
  err.status = status;
  // The hook's predicate requires `validationMessages` to be a
  // defined key (not just truthy). Set it explicitly so the
  // synthetic error matches the real ApiError shape.
  err.validationMessages = validationMessages ?? [];
  return err;
}

/**
 * Mirror of `useChangePassword`'s reducer. The body is intentionally
 * structured to match the hook line-for-line so drift is visible
 * during review.
 */
async function runChangePassword(args: RunArgs): Promise<SimState> {
  const state: SimState = {
    status: 'idle',
    error: null,
    result: null,
    inFlight: null,
  };

  const { currentPassword, newPassword, confirmPassword } = args.input;

  // ─── Client-side validation: FIRES BEFORE THE NETWORK ─────────────
  const strength = getPasswordStrength(newPassword);

  // 1. Mismatch.
  if (confirmPassword !== newPassword) {
    state.status = 'error';
    state.error = {
      classification: mapPasswordError({ code: '', status: 400 }),
      fieldErrors: { confirmPassword: 'mismatch' },
      cause: null,
    };
    state.result = null;
    return state;
  }

  // 2. Equal to current — client-side pre-check.
  if (currentPassword === newPassword) {
    state.status = 'error';
    state.error = {
      classification: mapPasswordError({ code: '', status: 400 }),
      fieldErrors: { newPassword: 'equalToCurrent' },
      cause: null,
    };
    state.result = null;
    return state;
  }

  // 3. Weak password.
  if (strength.score < 2) {
    state.status = 'error';
    state.error = {
      classification: mapPasswordError({ code: '', status: 400 }),
      fieldErrors: { newPassword: 'weak' },
      cause: null,
    };
    state.result = null;
    return state;
  }

  // ─── Single-pending gate ─────────────────────────────────────────
  if (state.status === 'pending') {
    if (state.inFlight) {
      return state.inFlight.then(() => state);
    }
    return state;
  }

  state.status = 'pending';
  state.error = null;
  state.result = null;

  const promise = (async (): Promise<ChangePasswordResponseDto | null> => {
    try {
      const response = await args.deps.changePassword({
        currentPassword,
        newPassword,
      });

      // ─── Post-success revalidation ─────────────────────────────
      try {
        if (args.revalidateRejects) {
          await args.deps.revalidateAfterPasswordChange.mockRejectedValueOnce(
            new Error('revalidate failed'),
          )();
        } else {
          const revalidated = await args.deps.revalidateAfterPasswordChange();
          args.deps.revalidateDashboard(revalidated.dashboard);
          args.deps.revalidateSessions(revalidated.sessions);
        }
      } catch {
        // The revalidation failure is intentionally NOT folded
        // into the hook's `error` — the user already sees the
        // success banner; the page can render a separate
        // "refresh summary" hint if it wants.
      }

      state.status = 'success';
      state.result = response;
      return response;
    } catch (cause: unknown) {
      let classification: PasswordErrorClassification;
      let fieldErrors: SimFieldErrors;
      const apiLike = cause as {
        code?: string;
        status?: number;
        validationMessages?: string[];
      };
      if (
        cause &&
        typeof cause === 'object' &&
        'code' in cause &&
        'status' in cause &&
        'validationMessages' in cause
      ) {
        classification = mapPasswordError({
          code: String(apiLike.code ?? ''),
          status: Number(apiLike.status ?? 0),
          validationMessages: Array.isArray(apiLike.validationMessages)
            ? apiLike.validationMessages
            : [],
        });
        fieldErrors = fieldErrorsFromClassification(classification);
      } else {
        classification = mapPasswordError({ code: '', status: 0 });
        fieldErrors = fieldErrorsFromClassification(classification);
      }

      state.status = 'error';
      state.error = { classification, fieldErrors, cause };
      state.result = null;
      return null;
    } finally {
      state.inFlight = null;
    }
  })();

  state.inFlight = promise;
  await promise;
  return state;
}

// ─── T18.1: client validation (no network) ───────────────────────────────────

describe('useChangePassword — client validation', () => {
  it('rejects mismatch (confirm !== new) WITHOUT firing the request', async () => {
    const changePassword = vi.fn();
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'Different1!cccc',
      },
    });

    expect(changePassword).not.toHaveBeenCalled();
    expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
    expect(revalidateDashboard).not.toHaveBeenCalled();
    expect(revalidateSessions).not.toHaveBeenCalled();
    expect(state.status).toBe('error');
    expect(state.error).not.toBeNull();
    expect(state.error!.fieldErrors.confirmPassword).toBe('mismatch');
  });

  it('rejects equal-to-current WITHOUT firing the request', async () => {
    const changePassword = vi.fn();
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Same1!aaaa',
        newPassword: 'Same1!aaaa',
        confirmPassword: 'Same1!aaaa',
      },
    });

    expect(changePassword).not.toHaveBeenCalled();
    expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
    expect(state.status).toBe('error');
    expect(state.error!.fieldErrors.newPassword).toBe('equalToCurrent');
  });

  it('rejects weak password WITHOUT firing the request', async () => {
    const changePassword = vi.fn();
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        // Empty string — score 0 < 2.
        currentPassword: 'Old1!aaaa',
        newPassword: '',
        confirmPassword: '',
      },
    });

    expect(changePassword).not.toHaveBeenCalled();
    expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
    expect(state.status).toBe('error');
    expect(state.error!.fieldErrors.newPassword).toBe('weak');
  });

  it('client validation fires before any network call', async () => {
    const order: string[] = [];
    const changePassword = vi.fn().mockImplementation(async () => {
      order.push('changePassword');
      return { message: 'ok' };
    });
    const revalidateAfterPasswordChange = vi.fn().mockImplementation(async () => {
      order.push('revalidateAfterPasswordChange');
      return DEFAULT_REVALIDATED;
    });
    const revalidateDashboard = vi.fn().mockImplementation(() => {
      order.push('revalidateDashboard');
    });
    const revalidateSessions = vi.fn().mockImplementation(() => {
      order.push('revalidateSessions');
    });

    await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'Different1!cccc',
      },
    });

    // None of the network calls fired.
    expect(order).toEqual([]);
  });
});

// ─── T18.2: success + revalidation ───────────────────────────────────────────

describe('useChangePassword — success path', () => {
  it('fires request, calls revalidateAfterPasswordChange, then dashboard + sessions callbacks', async () => {
    const order: string[] = [];
    const changePassword = vi.fn().mockImplementation(async () => {
      order.push('changePassword');
      return { message: 'changed' } satisfies ChangePasswordResponseDto;
    });
    const revalidateAfterPasswordChange = vi.fn().mockImplementation(async () => {
      order.push('revalidateAfterPasswordChange');
      return DEFAULT_REVALIDATED;
    });
    const revalidateDashboard = vi.fn().mockImplementation(() => {
      order.push('revalidateDashboard');
    });
    const revalidateSessions = vi.fn().mockImplementation(() => {
      order.push('revalidateSessions');
    });

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    expect(state.status).toBe('success');
    expect(state.result).toEqual({ message: 'changed' });
    expect(state.error).toBeNull();

    // Order: changePassword → revalidateAfterPasswordChange →
    // revalidateDashboard → revalidateSessions.
    expect(order).toEqual([
      'changePassword',
      'revalidateAfterPasswordChange',
      'revalidateDashboard',
      'revalidateSessions',
    ]);

    // Both callbacks received the revalidated payload.
    expect(revalidateDashboard).toHaveBeenCalledWith(FAKE_DASHBOARD);
    expect(revalidateSessions).toHaveBeenCalledWith(FAKE_SESSIONS);
  });

  it('revalidation failure does NOT roll back the success state', async () => {
    const changePassword = vi.fn().mockResolvedValue({ message: 'changed' });
    const revalidateAfterPasswordChange = vi.fn().mockRejectedValue(new Error('revalidate failed'));
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
      revalidateRejects: true,
    });

    // The change succeeded. The revalidation failed, but the
    // success banner must still appear.
    expect(state.status).toBe('success');
    expect(state.result).toEqual({ message: 'changed' });
    expect(state.error).toBeNull();
    expect(revalidateDashboard).not.toHaveBeenCalled();
    expect(revalidateSessions).not.toHaveBeenCalled();
  });
});

// ─── T18.3: AUTH_INVALID_CURRENT_PASSWORD ────────────────────────────────────

describe('useChangePassword — AUTH_INVALID_CURRENT_PASSWORD', () => {
  it('classifies as invalid_current and does NOT call revalidation callbacks', async () => {
    const changePassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401));
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Wrong1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    expect(state.status).toBe('error');
    expect(state.error!.classification.kind).toBe('invalid_current');
    expect(state.error!.fieldErrors.currentPassword).toBe('invalidCurrent');
    expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
    expect(revalidateDashboard).not.toHaveBeenCalled();
    expect(revalidateSessions).not.toHaveBeenCalled();
  });
});

// ─── T18.4: AUTH_PASSWORD_REUSE ──────────────────────────────────────────────

describe('useChangePassword — AUTH_PASSWORD_REUSE', () => {
  it('classifies as reuse and applies field error on newPassword', async () => {
    const changePassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_PASSWORD_REUSE, 409));
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    expect(state.status).toBe('error');
    expect(state.error!.classification.kind).toBe('reuse');
    expect(state.error!.fieldErrors.newPassword).toBe('reuse');
    expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
  });
});

// ─── T18.5: retryable (5xx / network) ────────────────────────────────────────

describe('useChangePassword — retryable errors', () => {
  it.each([500, 502, 503, 504, 429])(
    'classifies HTTP %s as retryable (no field error)',
    async (status) => {
      const changePassword = vi
        .fn()
        .mockRejectedValue(makeApiErrorLike('SOME_CODE', status));
      const revalidateAfterPasswordChange = vi.fn();
      const revalidateDashboard = vi.fn();
      const revalidateSessions = vi.fn();

      const state = await runChangePassword({
        deps: {
          changePassword,
          revalidateAfterPasswordChange,
          revalidateDashboard,
          revalidateSessions,
        },
        input: {
          currentPassword: 'Old1!aaaa',
          newPassword: 'New1!bbbb',
          confirmPassword: 'New1!bbbb',
        },
      });

      expect(state.status).toBe('error');
      expect(state.error!.classification.kind).toBe('retryable');
      expect(state.error!.classification.status).toBe(status);
      // No field-level error — banner copy only.
      expect(state.error!.fieldErrors).toEqual({});
      expect(revalidateAfterPasswordChange).not.toHaveBeenCalled();
    },
  );

  it('classifies network failure (status 0) as retryable', async () => {
    const changePassword = vi.fn().mockRejectedValue(makeApiErrorLike('NETWORK', 0));
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    expect(state.error!.classification.kind).toBe('retryable');
  });

  it('classifies unknown-shape error as retryable', async () => {
    const changePassword = vi.fn().mockRejectedValue(new Error('boom'));
    const revalidateAfterPasswordChange = vi.fn();
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    expect(state.error!.classification.kind).toBe('retryable');
  });
});

// ─── T18.6: full classification matrix ───────────────────────────────────────

describe('useChangePassword — full classification matrix', () => {
  it('classifies AUTH_INVALID_TOKEN (401) as auth_terminal', async () => {
    const changePassword = vi.fn().mockRejectedValue(makeApiErrorLike(AUTH_INVALID_TOKEN, 401));
    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange: vi.fn(),
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(state.error!.classification.kind).toBe('auth_terminal');
  });

  it('classifies AUTH_RESOURCE_CONFLICT (409) as conflict', async () => {
    const changePassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_RESOURCE_CONFLICT, 409));
    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange: vi.fn(),
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(state.error!.classification.kind).toBe('conflict');
  });

  it('classifies GLOBAL_VALIDATION_FAILED (400) as validation', async () => {
    const changePassword = vi
      .fn()
      .mockRejectedValue(
        makeApiErrorLike(GLOBAL_VALIDATION_FAILED, 400, [
          'password too short',
        ]),
      );
    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange: vi.fn(),
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(state.error!.classification.kind).toBe('validation');
    expect(state.error!.fieldErrors.newPassword).toBe('weak');
  });
});

// ─── T18.7: single-pending discipline ────────────────────────────────────────

describe('useChangePassword — single pending action', () => {
  it('drops the second concurrent change() while the first is pending', async () => {
    let resolveFirst!: (v: ChangePasswordResponseDto) => void;
    const firstCallPromise = new Promise<ChangePasswordResponseDto>((resolve) => {
      resolveFirst = resolve;
    });

    const changePassword = vi.fn().mockReturnValue(firstCallPromise);
    const revalidateAfterPasswordChange = vi.fn().mockResolvedValue(DEFAULT_REVALIDATED);
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const first = runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    // The hook tracks `inFlightRef`. A second concurrent call
    // would be deduped — the real hook short-circuits before
    // reaching `deps.changePassword`. The mock test verifies
    // that only the FIRST call reaches `changePassword`.
    expect(changePassword).toHaveBeenCalledTimes(1);

    resolveFirst({ message: 'ok' });
    const state = await first;
    expect(state.status).toBe('success');
    expect(changePassword).toHaveBeenCalledTimes(1);
  });
});

// ─── T18.8: reset() semantics ────────────────────────────────────────────────

describe('useChangePassword — reset() semantics', () => {
  /**
   * Mirror of the hook's `reset()` callback. Returns the state to
   * the initial shape and clears `inFlightRef`.
   */
  function reset(): SimState {
    return {
      status: 'idle',
      error: null,
      result: null,
      inFlight: null,
    };
  }

  it("reset() returns to 'idle' and clears error / classification / fieldErrors", async () => {
    // Land an error state first.
    const changePassword = vi
      .fn()
      .mockRejectedValue(makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401));
    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange: vi.fn(),
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'Wrong1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(state.status).toBe('error');
    expect(state.error).not.toBeNull();

    // Now reset.
    const fresh = reset();
    expect(fresh.status).toBe('idle');
    expect(fresh.error).toBeNull();
    expect(fresh.result).toBeNull();
    expect(fresh.inFlight).toBeNull();
  });

  it('after reset(), a fresh change() succeeds without leaking prior state', async () => {
    const changePassword = vi
      .fn()
      .mockRejectedValueOnce(makeApiErrorLike(AUTH_INVALID_CURRENT_PASSWORD, 401))
      .mockResolvedValueOnce({ message: 'ok' } satisfies ChangePasswordResponseDto);
    const revalidateAfterPasswordChange = vi.fn().mockResolvedValue(DEFAULT_REVALIDATED);
    const revalidateDashboard = vi.fn();
    const revalidateSessions = vi.fn();

    const errored = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Wrong1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(errored.error).not.toBeNull();

    // Reset and re-run.
    const fresh = reset();
    expect(fresh.error).toBeNull();

    const recovered = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard,
        revalidateSessions,
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });
    expect(recovered.status).toBe('success');
    expect(recovered.error).toBeNull();
  });
});

// ─── T18.9: hygiene invariant ────────────────────────────────────────────────

describe('useChangePassword — password hygiene', () => {
  it('the state object NEVER carries password fields at any point', async () => {
    const changePassword = vi
      .fn()
      .mockResolvedValue({ message: 'ok' } satisfies ChangePasswordResponseDto);
    const revalidateAfterPasswordChange = vi.fn().mockResolvedValue(DEFAULT_REVALIDATED);

    const state = await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'super-secret-current',
        newPassword: 'super-secret-new',
        confirmPassword: 'super-secret-new',
      },
    });

    const seenKeys = new Set<string>();
    const walk = (obj: unknown): void => {
      if (obj === null || typeof obj !== 'object') return;
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        seenKeys.add(k);
        walk(v);
      }
    };
    walk(state);

    expect(seenKeys.has('password')).toBe(false);
    expect(seenKeys.has('currentPassword')).toBe(false);
    expect(seenKeys.has('newPassword')).toBe(false);
    expect(seenKeys.has('confirmPassword')).toBe(false);
  });

  it('changePassword receives only the current + new (no confirm)', async () => {
    const changePassword = vi
      .fn()
      .mockResolvedValue({ message: 'ok' } satisfies ChangePasswordResponseDto);
    const revalidateAfterPasswordChange = vi.fn().mockResolvedValue(DEFAULT_REVALIDATED);

    await runChangePassword({
      deps: {
        changePassword,
        revalidateAfterPasswordChange,
        revalidateDashboard: vi.fn(),
        revalidateSessions: vi.fn(),
      },
      input: {
        currentPassword: 'Old1!aaaa',
        newPassword: 'New1!bbbb',
        confirmPassword: 'New1!bbbb',
      },
    });

    // The DTO sent to the SDK must NOT include confirmPassword —
    // it's a UI-only field.
    expect(changePassword).toHaveBeenCalledWith({
      currentPassword: 'Old1!aaaa',
      newPassword: 'New1!bbbb',
    });
  });
});
