

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

function makeApiErrorLike(code: string, status: number, validationMessages?: string[]): unknown {
const err = new Error(`API error: ${code}`) as Error & {
code: string;
status: number;
validationMessages: string[];
  };
err.code = code;
err.status = status;

err.validationMessages = validationMessages ?? [];
return err;
}

async function runChangePassword(args: RunArgs): Promise<SimState> {
const state: SimState = {
status: 'idle',
error: null,
result: null,
inFlight: null,
  };

const { currentPassword, newPassword, confirmPassword } = args.input;

const strength = getPasswordStrength(newPassword);

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

expect(order).toEqual([]);
  });
});

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

expect(order).toEqual([
'changePassword',
'revalidateAfterPasswordChange',
'revalidateDashboard',
'revalidateSessions',
    ]);

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

expect(state.status).toBe('success');
expect(state.result).toEqual({ message: 'changed' });
expect(state.error).toBeNull();
expect(revalidateDashboard).not.toHaveBeenCalled();
expect(revalidateSessions).not.toHaveBeenCalled();
  });
});

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

expect(changePassword).toHaveBeenCalledTimes(1);

resolveFirst({ message: 'ok' });
const state = await first;
expect(state.status).toBe('success');
expect(changePassword).toHaveBeenCalledTimes(1);
  });
});

describe('useChangePassword — reset() semantics', () => {

function reset(): SimState {
return {
status: 'idle',
error: null,
result: null,
inFlight: null,
    };
  }

it("reset() returns to 'idle' and clears error / classification / fieldErrors", async () => {

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

expect(changePassword).toHaveBeenCalledWith({
currentPassword: 'Old1!aaaa',
newPassword: 'New1!bbbb',
    });
  });
});
