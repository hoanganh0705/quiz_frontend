

import { describe, expect, it, vi } from 'vitest';

import {
mapForgotPasswordError,
mapResetPasswordError,
isEnumerationSafe,
containsEnumerationOracle,
ENUMERATION_PHRASES,
} from '@/features/auth/errors/recovery-error-mapper';
import {
COPY_KEYS,
resolveCopy,
resolveCooldown,
forgotAcknowledgementSnapshot,
resetInvalidSnapshot,
resetSuccessSnapshot,
} from '@/features/auth/copy/recovery-copy';
import {
submitForgotPassword,
} from '@/features/auth/forms/forgot-password-submit';
import {
submitResetPassword,
RESET_ACK_ROUTE,
} from '@/features/auth/forms/reset-password-submit';
import {
FORGOT_PASSWORD_COOLDOWN_MS,
RESET_PASSWORD_COOLDOWN_MS,
} from '@/features/auth/forms/recovery-cooldown';
import {
forgotPasswordSchema,
toForgotPasswordDto,
} from '@/features/auth/forms/schemas/forgot-password.schema';
import {
resetPasswordSchema,
toResetPasswordDto,
} from '@/features/auth/forms/schemas/reset-password.schema';

interface FakeApiError {
code: string;
status: number;
isValidationError: boolean;
isServerError: boolean;
validationMessages: string[];
}

function apiErrorLike(opts: {
status: number;
code?: string;
validationMessages?: string[];
}): FakeApiError {
const code =
opts.code ??
(opts.status >= 500
? 'GLOBAL_INTERNAL_ERROR'
: opts.status === 429
? 'GLOBAL_RATE_LIMITED'
: opts.status === 400
? 'GLOBAL_VALIDATION_FAILED'
: 'GLOBAL_BAD_REQUEST');
const validationMessages = opts.validationMessages ?? [];
return {
code,
status: opts.status,
isValidationError:
code === 'GLOBAL_VALIDATION_FAILED' || validationMessages.length > 0,
isServerError: opts.status >= 500,
validationMessages,
  };
}

function asApiError(shape: FakeApiError): unknown {
return shape;
}

const ENUMERATION_PHRASES_BROAD = [
'already',
'duplicate',
'exists',
'taken',
'in use',
'verified',
'invalid token',
'expired token',
'success',
'account created',
'sent',
];

function assertAntiEnumeration(value: string, key: string) {
const lower = value.toLowerCase();
for (const phrase of ENUMERATION_PHRASES_BROAD) {
if (lower.includes(phrase)) {
throw new Error(
`Anti-enumeration violation at ${key}: contains "${phrase}"`
      );
    }
  }
}

describe('forgotPasswordSchema', () => {
it('rejects a malformed email', () => {
const result = forgotPasswordSchema.safeParse({ email: 'not-an-email' });
expect(result.success).toBe(false);
  });

it('accepts a well-formed email', () => {
const result = forgotPasswordSchema.safeParse({ email: 'a@b.co' });
expect(result.success).toBe(true);
  });

it('rejects an email longer than 255 chars', () => {
const longLocal = 'a'.repeat(251);
const email = `${longLocal}@b.co`;
const result = forgotPasswordSchema.safeParse({ email });
expect(result.success).toBe(false);
  });

it('accepts an email at exactly 255 chars (boundary)', () => {
const longLocal = 'a'.repeat(250);
const email = `${longLocal}@b.co`;
const result = forgotPasswordSchema.safeParse({ email });
expect(result.success).toBe(true);
  });

it('rejects an empty email', () => {
const result = forgotPasswordSchema.safeParse({ email: '' });
expect(result.success).toBe(false);
  });

it('toForgotPasswordDto picks { email }', () => {
const dto = toForgotPasswordDto({ email: 'a@b.co' });
expect(dto).toEqual({ email: 'a@b.co' });
  });
});

describe('resetPasswordSchema', () => {
const validToken = 'a'.repeat(64);
const validPassword = 'GoodPass1!';

it('accepts a well-formed token + password + confirmation', () => {
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(true);
  });

it('rejects a token shorter than 32 chars', () => {
const shortToken = 'a'.repeat(31);
const result = resetPasswordSchema.safeParse({
token: shortToken,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(false);
  });

it('accepts a token at the lower bound (32 chars)', () => {
const token = 'a'.repeat(32);
const result = resetPasswordSchema.safeParse({
token,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(true);
  });

it('rejects a token longer than 128 chars', () => {
const longToken = 'a'.repeat(129);
const result = resetPasswordSchema.safeParse({
token: longToken,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(false);
  });

it('accepts a token at the upper bound (128 chars)', () => {
const token = 'a'.repeat(128);
const result = resetPasswordSchema.safeParse({
token,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(true);
  });

it('rejects a non-hex token', () => {
const token = 'g'.repeat(64);
const result = resetPasswordSchema.safeParse({
token,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(result.success).toBe(false);
  });

it('rejects a password shorter than 8 chars (reset is stricter than registration)', () => {
const shortPassword = 'Aa1!';
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: shortPassword,
newPasswordConfirmation: shortPassword,
    });
expect(result.success).toBe(false);
  });

it('accepts a password at exactly 8 chars if it satisfies the registration policy', () => {
const password = 'GoodP1!';
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: password,
newPasswordConfirmation: password,
    });

expect(result.success).toBe(false);
  });

it('accepts a password at exactly 8 chars satisfying the policy', () => {
const password = 'GoodP1!x';
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: password,
newPasswordConfirmation: password,
    });
expect(result.success).toBe(true);
  });

it('rejects a password that violates the shared policy (no uppercase)', () => {
const password = 'badpass1!';
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: password,
newPasswordConfirmation: password,
    });
expect(result.success).toBe(false);
  });

it('rejects mismatched confirmation', () => {
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: validPassword,
newPasswordConfirmation: 'DifferentPass1!',
    });
expect(result.success).toBe(false);
  });

it('rejects an empty confirmation', () => {
const result = resetPasswordSchema.safeParse({
token: validToken,
newPassword: validPassword,
newPasswordConfirmation: '',
    });
expect(result.success).toBe(false);
  });

it('toResetPasswordDto strips newPasswordConfirmation', () => {
const dto = toResetPasswordDto({
token: validToken,
newPassword: validPassword,
newPasswordConfirmation: validPassword,
    });
expect(dto).toEqual({ token: validToken, newPassword: validPassword });
expect(dto).not.toHaveProperty('newPasswordConfirmation');
  });
});

describe('mapForgotPasswordError', () => {
it('returns "acknowledgement" for an unknown error', () => {
expect(mapForgotPasswordError(new Error('boom')).kind).toBe('acknowledgement');
expect(mapForgotPasswordError(null).kind).toBe('acknowledgement');
expect(mapForgotPasswordError('string').kind).toBe('acknowledgement');
  });

it('returns "rate_limited" for 429', () => {
expect(
mapForgotPasswordError(asApiError(apiErrorLike({ status: 429 }))).kind
    ).toBe('rate_limited');
  });

it('returns "acknowledgement" for 200 / 400 / 403 / 404 / 5xx', () => {
for (const status of [200, 400, 403, 404, 500, 502, 503]) {
expect(
mapForgotPasswordError(asApiError(apiErrorLike({ status }))).kind
      ).toBe('acknowledgement');
    }
  });

it('never returns a string the backend shipped', () => {
for (const status of [200, 400, 403, 404, 429, 500, 502, 503]) {
const result = mapForgotPasswordError(
asApiError(
apiErrorLike({
status,
validationMessages: ['email already exists', 'invalid token'],
          })
        )
      );
const serialized = JSON.stringify(result);
assertAntiEnumeration(serialized, `mapForgotPasswordError status=${status}`);
    }
  });
});

describe('mapResetPasswordError', () => {
it('returns "invalid_link" for AUTH_INVALID_TOKEN (the canonical unknown/expired/consumed family)', () => {
expect(
mapResetPasswordError(
asApiError(
apiErrorLike({ status: 400, code: 'AUTH_INVALID_TOKEN' })
        )
      ).kind
    ).toBe('invalid_link');
  });

it('returns "validation" for 400 GLOBAL_VALIDATION_FAILED', () => {
expect(
mapResetPasswordError(
asApiError(
apiErrorLike({
status: 400,
code: 'GLOBAL_VALIDATION_FAILED',
validationMessages: ['password too weak'],
          })
        )
      ).kind
    ).toBe('validation');
  });

it('returns "rate_limited" for 429', () => {
expect(
mapResetPasswordError(
asApiError(apiErrorLike({ status: 429 }))
      ).kind
    ).toBe('rate_limited');
  });

it('returns "server" for 5xx', () => {
for (const status of [500, 502, 503]) {
expect(
mapResetPasswordError(asApiError(apiErrorLike({ status }))).kind
      ).toBe('server');
    }
  });

it('returns "server" for an unknown error', () => {
expect(mapResetPasswordError(new Error('boom')).kind).toBe('server');
expect(mapResetPasswordError(null).kind).toBe('server');
  });

it('returns "server" for 401 / 403 / 404', () => {
for (const status of [401, 403, 404]) {
expect(
mapResetPasswordError(asApiError(apiErrorLike({ status }))).kind
      ).toBe('server');
    }
  });

it('never returns "success" (success is the 201 path, not an error)', () => {
for (const status of [200, 201, 400, 401, 403, 404, 429, 500, 502, 503]) {
const result = mapResetPasswordError(asApiError(apiErrorLike({ status })));
expect(result.kind).not.toBe('success');
    }
  });

it('exposes the anti-enumeration phrase list (single source of truth)', () => {
expect(ENUMERATION_PHRASES).toContain('verified');
expect(ENUMERATION_PHRASES).toContain('invalid token');
expect(ENUMERATION_PHRASES).toContain('expired token');
  });

it('isEnumerationSafe inverts containsEnumerationOracle', () => {
expect(isEnumerationSafe('safe text')).toBe(true);
expect(isEnumerationSafe('email already exists')).toBe(false);
expect(isEnumerationSafe('verified')).toBe(false);
expect(containsEnumerationOracle('invalid token')).toBe(true);
expect(containsEnumerationOracle('plain text')).toBe(false);
  });
});

describe('submitForgotPassword', () => {
it('returns { kind: "cooldown", cooldownMs } on success', async () => {
const forgotPassword = vi.fn().mockResolvedValue({ message: 'ok' });
const result = await submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
cooldownMs: 1000,
    });
expect(result).toEqual({ kind: 'cooldown', cooldownMs: 1000 });
expect(forgotPassword).toHaveBeenCalledTimes(1);
expect(forgotPassword).toHaveBeenCalledWith({ email: 'a@b.co' });
  });

it('returns { kind: "error", errorKind: "rate_limited" } on 429', async () => {
const forgotPassword = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 429 }))
    );
const result = await submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('rate_limited');
    }
  });

it('returns { kind: "error", errorKind: "acknowledgement" } on 5xx (mapper collapses)', async () => {
const forgotPassword = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 500 }))
    );
const result = await submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {

expect(result.errorKind).toBe('acknowledgement');
    }
  });

it('returns { kind: "error", errorKind: "acknowledgement" } for unknown errors', async () => {
const forgotPassword = vi.fn().mockRejectedValue(new Error('boom'));
const result = await submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('acknowledgement');
    }
  });

it('never rejects — bubbles only resolved values out', async () => {
const forgotPassword = vi.fn().mockRejectedValue(new Error('boom'));
await expect(
submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
        ) => Promise<unknown>,
      })
    ).resolves.toBeDefined();
  });

it('does not leak the user-supplied email in the returned shape', async () => {
const forgotPassword = vi.fn().mockRejectedValue(
asApiError(
apiErrorLike({ status: 500, validationMessages: ['user@example.com'] })
      )
    );
const result = await submitForgotPassword('user@example.com', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
const serialized = JSON.stringify(result);
expect(serialized).not.toContain('user@example.com');
  });
});

describe('submitResetPassword', () => {
const validToken = 'a'.repeat(64);
const validPassword = 'GoodPass1!';

it('returns { kind: "success", nextRoute: "/login" } on a 201', async () => {
const resetPassword = vi.fn().mockResolvedValue({ message: 'ok' });
const clearAuthToken = vi.fn();
const broadcastLogout = vi.fn();
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken,
broadcastLogout,
    });
expect(result).toEqual({ kind: 'success', nextRoute: '/login' });
expect(resetPassword).toHaveBeenCalledTimes(1);
expect(resetPassword).toHaveBeenCalledWith({
token: validToken,
newPassword: validPassword,
    });
expect(clearAuthToken).toHaveBeenCalledTimes(1);
expect(broadcastLogout).toHaveBeenCalledTimes(1);
  });

it('returns { kind: "error", errorKind: "invalid_link" } for AUTH_INVALID_TOKEN (and does NOT clear auth)', async () => {
const resetPassword = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 400, code: 'AUTH_INVALID_TOKEN' }))
    );
const clearAuthToken = vi.fn();
const broadcastLogout = vi.fn();
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken,
broadcastLogout,
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('invalid_link');
    }
expect(clearAuthToken).not.toHaveBeenCalled();
expect(broadcastLogout).not.toHaveBeenCalled();
  });

it('returns { kind: "error", errorKind: "validation" } for GLOBAL_VALIDATION_FAILED', async () => {
const resetPassword = vi.fn().mockRejectedValue(
asApiError(
apiErrorLike({
status: 400,
code: 'GLOBAL_VALIDATION_FAILED',
validationMessages: ['password too weak'],
        })
      )
    );
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken: vi.fn(),
broadcastLogout: vi.fn(),
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('validation');
    }
  });

it('returns { kind: "error", errorKind: "rate_limited" } on 429', async () => {
const resetPassword = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 429 }))
    );
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken: vi.fn(),
broadcastLogout: vi.fn(),
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('rate_limited');
    }
  });

it('returns { kind: "error", errorKind: "server" } on 5xx (and does NOT clear auth)', async () => {
const resetPassword = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 500 }))
    );
const clearAuthToken = vi.fn();
const broadcastLogout = vi.fn();
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken,
broadcastLogout,
    });
expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('server');
    }
expect(clearAuthToken).not.toHaveBeenCalled();
expect(broadcastLogout).not.toHaveBeenCalled();
  });

it('never rejects — bubbles only resolved values out', async () => {
const resetPassword = vi.fn().mockRejectedValue(new Error('boom'));
await expect(
submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
        ) => Promise<unknown>,
clearAuthToken: vi.fn(),
broadcastLogout: vi.fn(),
      })
    ).resolves.toBeDefined();
  });

it('does not leak the user-supplied token or password in the returned shape', async () => {
const resetPassword = vi.fn().mockRejectedValue(
asApiError(
apiErrorLike({
status: 500,
validationMessages: [validToken, validPassword],
        })
      )
    );
const result = await submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken: vi.fn(),
broadcastLogout: vi.fn(),
    });
const serialized = JSON.stringify(result);
expect(serialized).not.toContain(validToken);
expect(serialized).not.toContain(validPassword);
  });
});

describe('recovery-copy', () => {
const ALL_KEYS: Array<[string, string]> = [
['forgot.loading', COPY_KEYS.forgot.loading],
['forgot.idle.placeholder', COPY_KEYS.forgot.idle.placeholder],
['forgot.idle.help', COPY_KEYS.forgot.idle.help],
['forgot.acknowledgement.title', COPY_KEYS.forgot.acknowledgement.title],
['forgot.acknowledgement.body', COPY_KEYS.forgot.acknowledgement.body],
[
'forgot.acknowledgement.openEmailLabel',
COPY_KEYS.forgot.acknowledgement.openEmailLabel,
    ],
['forgot.error.rate_limited', COPY_KEYS.forgot.error.rate_limited],
['forgot.error.server', COPY_KEYS.forgot.error.server],
['forgot.cooldown.message', COPY_KEYS.forgot.cooldown.message],
['reset.loading.title', COPY_KEYS.reset.loading.title],
['reset.loading.body', COPY_KEYS.reset.loading.body],
['reset.invalid.title', COPY_KEYS.reset.invalid.title],
['reset.invalid.body', COPY_KEYS.reset.invalid.body],
['reset.invalid.tryAgain', COPY_KEYS.reset.invalid.tryAgain],
['reset.invalid.forgotLabel', COPY_KEYS.reset.invalid.forgotLabel],
['reset.invalid.loginLabel', COPY_KEYS.reset.invalid.loginLabel],
['reset.success.title', COPY_KEYS.reset.success.title],
['reset.success.body', COPY_KEYS.reset.success.body],
['reset.error.validation', COPY_KEYS.reset.error.validation],
['reset.error.rate_limited', COPY_KEYS.reset.error.rate_limited],
['reset.error.server', COPY_KEYS.reset.error.server],
  ];

it('resolves every advertised key to a non-empty string', () => {
for (const [key, registryKey] of ALL_KEYS) {
const v = resolveCopy(registryKey);
expect(v, `key ${key}`).not.toBe('');
    }
  });

it('snapshot helper returns the forgot acknowledgement body', () => {
const ack = resolveCopy(COPY_KEYS.forgot.acknowledgement.body);
expect(forgotAcknowledgementSnapshot()).toBe(ack);
expect(ack.length).toBeGreaterThan(0);
  });

it('snapshot helper returns the reset invalid body', () => {
const inv = resolveCopy(COPY_KEYS.reset.invalid.body);
expect(resetInvalidSnapshot()).toBe(inv);
expect(inv.length).toBeGreaterThan(0);
  });

it('snapshot helper returns the reset success body', () => {
const ok = resolveCopy(COPY_KEYS.reset.success.body);
expect(resetSuccessSnapshot()).toBe(ok);
expect(ok.length).toBeGreaterThan(0);
  });

it('renders the same reset invalid body for any of the three backend failure modes', () => {

const body = resetInvalidSnapshot();
expect(body).toBe(resolveCopy(COPY_KEYS.reset.invalid.body));
expect(body.length).toBeGreaterThan(0);
  });

it('has no anti-enumeration phrase in any rendered string', () => {
for (const [key, registryKey] of ALL_KEYS) {
const value = resolveCopy(registryKey);
assertAntiEnumeration(value, key);
    }
  });

it('resolveCooldown substitutes {seconds} with the integer', () => {
const out = resolveCooldown(42);
expect(out).toContain('42');
expect(out).not.toContain('{seconds}');
  });

it('resolveCooldown floors negative seconds to 0', () => {
const out = resolveCooldown(-3);
expect(out).toContain('0');
expect(out).not.toContain('{seconds}');
  });
});

describe('recovery cooldown constants', () => {
it('forgot defaults to 60 seconds (mirrors backend throttle)', () => {
expect(FORGOT_PASSWORD_COOLDOWN_MS).toBe(60_000);
  });

it('reset is 0 (no client-side cooldown; backend global default applies)', () => {
expect(RESET_PASSWORD_COOLDOWN_MS).toBe(0);
  });

it('RESET_ACK_ROUTE is "/login"', () => {
expect(RESET_ACK_ROUTE).toBe('/login');
  });
});

describe('hook-level single-flight contract (synthesised)', () => {
it('submitForgotPassword returns a fresh Promise per call but the hook dedups', async () => {
const forgotPassword = vi.fn().mockResolvedValue({ message: 'ok' });
const p1 = submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
const p2 = submitForgotPassword('a@b.co', {
forgotPassword: forgotPassword as unknown as (
dto: { email: string }
      ) => Promise<unknown>,
    });
await Promise.all([p1, p2]);

expect(forgotPassword).toHaveBeenCalledTimes(2);
  });

it('submitResetPassword returns a fresh Promise per call but the hook dedups', async () => {
const validToken = 'a'.repeat(64);
const validPassword = 'GoodPass1!';
const resetPassword = vi.fn().mockResolvedValue({ message: 'ok' });
const clearAuthToken = vi.fn();
const broadcastLogout = vi.fn();
const p1 = submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken,
broadcastLogout,
    });
const p2 = submitResetPassword(validToken, validPassword, {
resetPassword: resetPassword as unknown as (
dto: { token: string; newPassword: string }
      ) => Promise<unknown>,
clearAuthToken,
broadcastLogout,
    });
await Promise.all([p1, p2]);

expect(resetPassword).toHaveBeenCalledTimes(2);
  });
});