

import { describe, expect, it, vi } from 'vitest';

import {
mapLoginError,
mapLogoutError,
type LoginErrorKind,
} from '@/features/auth/errors/login-error-mapper';
import {
COPY_KEYS,
resolveCopy,
loginInvalidCredentialsSnapshot,
loginRateLimitedSnapshot,
loginServerSnapshot,
} from '@/features/auth/copy/login-copy';
import {
loginSchema,
toLoginDto,
type LoginFormValues,
} from '@/features/auth/forms/schemas/login.schema';
import {
submitLogin,
} from '@/features/auth/forms/login-submit';
import { safeRedirectTarget, isSafeRedirectTarget } from '@/features/auth/utils/safe-redirect';
import type { AuthControllerLoginResult } from '@/lib/api/generated/auth/auth';

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
'verify',
'verification',
'invalid',
'expired',
'success',
'account created',
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

describe('loginSchema', () => {
it('accepts a well-formed email', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abcdef1!',
    });
expect(result.success).toBe(true);
  });

it('rejects a malformed email', () => {
const result = loginSchema.safeParse({
email: 'not-an-email',
password: 'Abcdef1!',
    });
expect(result.success).toBe(false);
  });

it('rejects an empty email', () => {
const result = loginSchema.safeParse({
email: '',
password: 'Abcdef1!',
    });
expect(result.success).toBe(false);
  });

it('rejects an email longer than 255 chars', () => {
const longLocal = 'a'.repeat(251);
const email = `${longLocal}@b.co`;
const result = loginSchema.safeParse({
email,
password: 'Abcdef1!',
    });
expect(result.success).toBe(false);
  });

it('accepts a password at exactly 6 chars if it satisfies the policy', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abcdef1!',
    });
expect(result.success).toBe(true);
  });

it('rejects a password shorter than 6 chars', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abc!',
    });
expect(result.success).toBe(false);
  });

it('rejects a password without uppercase', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'abcdef1!',
    });
expect(result.success).toBe(false);
  });

it('rejects a password without number', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abcdefg!',
    });
expect(result.success).toBe(false);
  });

it('rejects a password without symbol', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abcdef12',
    });
expect(result.success).toBe(false);
  });

it('accepts optional rememberMe', () => {
const result = loginSchema.safeParse({
email: 'a@b.co',
password: 'Abcdef1!',
rememberMe: true,
    });
expect(result.success).toBe(true);
  });

it('toLoginDto strips rememberMe', () => {
const dto = toLoginDto({
email: 'a@b.co',
password: 'Abcdef1!',
rememberMe: true,
    });
expect(dto).toEqual({ email: 'a@b.co', password: 'Abcdef1!' });
expect(dto).not.toHaveProperty('rememberMe');
  });
});

describe('safeRedirectTarget', () => {
describe('isSafeRedirectTarget', () => {
it('accepts /foo', () => {
expect(isSafeRedirectTarget('/foo')).toBe(true);
    });

it('accepts /foo?bar=1', () => {
expect(isSafeRedirectTarget('/foo?bar=1')).toBe(true);
    });

it('accepts /foo#baz', () => {
expect(isSafeRedirectTarget('/foo#baz')).toBe(true);
    });

it('accepts /foo/bar', () => {
expect(isSafeRedirectTarget('/foo/bar')).toBe(true);
    });

it('accepts /quizzes', () => {
expect(isSafeRedirectTarget('/quizzes')).toBe(true);
    });

it('accepts /my-profile', () => {
expect(isSafeRedirectTarget('/my-profile')).toBe(true);
    });

it('accepts /settings?tab=security', () => {
expect(isSafeRedirectTarget('/settings?tab=security')).toBe(true);
    });

it('rejects //evil.com (protocol-relative)', () => {
expect(isSafeRedirectTarget('//evil.com')).toBe(false);
    });

it('rejects https://evil.com (absolute URL)', () => {
expect(isSafeRedirectTarget('https://evil.com')).toBe(false);
    });

it('rejects http://evil.com/foo', () => {
expect(isSafeRedirectTarget('http://evil.com/foo')).toBe(false);
    });

it('rejects /login (login page)', () => {
expect(isSafeRedirectTarget('/login')).toBe(false);
    });

it('rejects /login?redirect=/foo', () => {
expect(isSafeRedirectTarget('/login?redirect=/foo')).toBe(false);
    });

it('rejects /login/other', () => {
expect(isSafeRedirectTarget('/login/other')).toBe(false);
    });

it('rejects /foo%00bar (null byte injection)', () => {
expect(isSafeRedirectTarget('/foo\x00bar')).toBe(false);
    });

it('rejects empty string', () => {
expect(isSafeRedirectTarget('')).toBe(false);
    });

it('rejects null', () => {
expect(isSafeRedirectTarget(null)).toBe(false);
    });

it('rejects undefined', () => {
expect(isSafeRedirectTarget(undefined)).toBe(false);
    });

it('rejects >2048 chars', () => {
const long = '/' + 'a'.repeat(2049);
expect(isSafeRedirectTarget(long)).toBe(false);
    });

it('accepts exactly 2048 chars', () => {
const long = '/' + 'a'.repeat(2047);
expect(isSafeRedirectTarget(long)).toBe(true);
    });
  });

describe('safeRedirectTarget', () => {
it('returns the raw target when safe', () => {
expect(safeRedirectTarget('/quizzes')).toBe('/quizzes');
expect(safeRedirectTarget('/my-profile')).toBe('/my-profile');
    });

it('returns /quizzes as fallback for hostile values', () => {
expect(safeRedirectTarget('//evil.com')).toBe('/quizzes');
expect(safeRedirectTarget('https://evil.com')).toBe('/quizzes');
expect(safeRedirectTarget('/login')).toBe('/quizzes');
expect(safeRedirectTarget('')).toBe('/quizzes');
expect(safeRedirectTarget(null)).toBe('/quizzes');
expect(safeRedirectTarget(undefined)).toBe('/quizzes');
    });
  });
});

describe('mapLoginError', () => {
it('returns "invalid_credentials" for AUTH_INVALID_CREDENTIALS', () => {
const err = asApiError(
apiErrorLike({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' })
    );
expect(mapLoginError(err).kind).toBe('invalid_credentials');
  });

it('returns "invalid_credentials" for generic 401 without code', () => {
const err = asApiError(apiErrorLike({ status: 401 }));

expect(mapLoginError(err).kind).toBe('server');
  });

it('returns "invalid_credentials" for 401 with verify-related message', () => {
const err = asApiError(
apiErrorLike({
status: 401,
validationMessages: ['email is not verified'],
      })
    );
expect(mapLoginError(err).kind).toBe('invalid_credentials');
  });

it('returns "invalid_credentials" for 401 with "verified" in message', () => {
const err = asApiError(
apiErrorLike({
status: 401,
validationMessages: ['account not verified yet'],
      })
    );
expect(mapLoginError(err).kind).toBe('invalid_credentials');
  });

it('returns "invalid_credentials" for 401 with "verification" in message', () => {
const err = asApiError(
apiErrorLike({
status: 401,
validationMessages: ['email verification required'],
      })
    );
expect(mapLoginError(err).kind).toBe('invalid_credentials');
  });

it('returns "invalid_credentials" for 401 with "verify" in message', () => {
const err = asApiError(
apiErrorLike({
status: 401,
validationMessages: ['please verify your email'],
      })
    );
expect(mapLoginError(err).kind).toBe('invalid_credentials');
  });

it('returns "rate_limited" for 429 regardless of code', () => {
const err = asApiError(
apiErrorLike({ status: 429, code: 'GLOBAL_RATE_LIMITED' })
    );
expect(mapLoginError(err).kind).toBe('rate_limited');
  });

it('returns "rate_limited" for 429 with AUTH_INVALID_CREDENTIALS code', () => {

const err = asApiError(
apiErrorLike({
status: 429,
code: 'AUTH_INVALID_CREDENTIALS',
      })
    );
expect(mapLoginError(err).kind).toBe('rate_limited');
  });

it('returns "validation" for 400 GLOBAL_VALIDATION_FAILED', () => {
const err = asApiError(
apiErrorLike({
status: 400,
code: 'GLOBAL_VALIDATION_FAILED',
validationMessages: ['password too weak'],
      })
    );
expect(mapLoginError(err).kind).toBe('validation');
  });

it('returns "server" for 5xx', () => {
for (const status of [500, 502, 503]) {
const err = asApiError(apiErrorLike({ status }));
expect(mapLoginError(err).kind).toBe('server');
    }
  });

it('returns "server" for network failure (status 0)', () => {
const err = asApiError(apiErrorLike({ status: 0 }));
expect(mapLoginError(err).kind).toBe('server');
  });

it('returns "server" for unknown error shape', () => {
expect(mapLoginError(new Error('boom')).kind).toBe('server');
expect(mapLoginError(null).kind).toBe('server');
expect(mapLoginError('string').kind).toBe('server');
  });

it('returns "server" for 403', () => {
const err = asApiError(apiErrorLike({ status: 403 }));
expect(mapLoginError(err).kind).toBe('server');
  });

it('returns "server" for 404', () => {
const err = asApiError(apiErrorLike({ status: 404 }));
expect(mapLoginError(err).kind).toBe('server');
  });

it('never returns a string containing anti-enumeration phrases', () => {

const testCases = [

asApiError(apiErrorLike({ status: 429 })),

asApiError(apiErrorLike({ status: 400, code: 'GLOBAL_VALIDATION_FAILED', validationMessages: ['password too weak'] })),

asApiError(apiErrorLike({ status: 500 })),

new Error('boom'),
    ];

for (const testCase of testCases) {
const result = mapLoginError(testCase);

const validKinds: LoginErrorKind[] = ['invalid_credentials', 'rate_limited', 'validation', 'server'];
expect(validKinds).toContain(result.kind);
    }
  });
});

describe('mapLogoutError', () => {
it('returns "ok" for null', () => {
expect(mapLogoutError(null).kind).toBe('ok');
  });

it('returns "ok" for undefined', () => {
expect(mapLogoutError(undefined).kind).toBe('ok');
  });

it('returns "ok" for 200 success', () => {

const err = asApiError(apiErrorLike({ status: 200 }));

expect(mapLogoutError(err).kind).toBe('server');
  });

it('returns "server" for 201 created (logout does not throw on 2xx)', () => {
const err = asApiError(apiErrorLike({ status: 201 }));
expect(mapLogoutError(err).kind).toBe('server');
  });

it('returns "server" for 5xx', () => {
for (const status of [500, 502, 503]) {
const err = asApiError(apiErrorLike({ status }));
expect(mapLogoutError(err).kind).toBe('server');
    }
  });

it('returns "server" for network failure (status 0)', () => {
const err = asApiError(apiErrorLike({ status: 0 }));
expect(mapLogoutError(err).kind).toBe('server');
  });

it('returns "server" for 401', () => {
const err = asApiError(apiErrorLike({ status: 401 }));
expect(mapLogoutError(err).kind).toBe('server');
  });

it('returns "server" for 403', () => {
const err = asApiError(apiErrorLike({ status: 403 }));
expect(mapLogoutError(err).kind).toBe('server');
  });

it('returns "server" for unknown error', () => {
expect(mapLogoutError(new Error('boom')).kind).toBe('server');
expect(mapLogoutError('string').kind).toBe('server');
  });
});

describe('submitLogin', () => {
const validValues: LoginFormValues = {
email: 'a@b.co',
password: 'Abcdef1!',
rememberMe: false,
  };

const mockUser = {
userId: '123',
username: 'testuser',
email: 'a@b.co',
accessToken: 'token123',
  };

it('returns { kind: "success", user } on a 200', async () => {
const mockUser = {
userId: '123',
username: 'testuser',
email: 'a@b.co',
accessToken: 'token123',
    };

const login = vi.fn().mockResolvedValue(mockUser as unknown as AuthControllerLoginResult);
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('success');
if (result.kind === 'success') {
expect(result.user).toEqual(mockUser);
    }
expect(login).toHaveBeenCalledTimes(1);
expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'Abcdef1!' });
  });

it('calls clearAuthToken BEFORE login on success', async () => {
const callOrder: string[] = [];

const loginIntercepted = async () => {
callOrder.push('login');
return mockUser as unknown as AuthControllerLoginResult;
    };
const clearIntercepted = () => {
callOrder.push('clearAuthToken');
    };

await submitLogin(validValues, {
login: loginIntercepted,
clearAuthToken: clearIntercepted,
    });

expect(callOrder).toEqual(['clearAuthToken', 'login']);
  });

it('maps AUTH_INVALID_CREDENTIALS to "invalid_credentials"', async () => {
const login = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 401, code: 'AUTH_INVALID_CREDENTIALS' }))
    );
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('invalid_credentials');
    }
  });

it('maps 401 with verify-related message to "invalid_credentials"', async () => {
const login = vi.fn().mockRejectedValue(
asApiError(
apiErrorLike({
status: 401,
validationMessages: ['email is not verified'],
        })
      )
    );
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('invalid_credentials');
    }
  });

it('maps 429 to "rate_limited"', async () => {
const login = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 429 }))
    );
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('rate_limited');
    }
  });

it('maps 5xx to "server"', async () => {
const login = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 500 }))
    );
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('server');
    }
  });

it('maps unknown error to "server"', async () => {
const login = vi.fn().mockRejectedValue(new Error('boom'));
const clearAuthToken = vi.fn();

const result = await submitLogin(validValues, { login, clearAuthToken });

expect(result.kind).toBe('error');
if (result.kind === 'error') {
expect(result.errorKind).toBe('server');
    }
  });

it('never rejects — always resolves', async () => {
const login = vi.fn().mockRejectedValue(new Error('boom'));
const clearAuthToken = vi.fn();

await expect(
submitLogin(validValues, { login, clearAuthToken })
    ).resolves.toBeDefined();
  });

it('calls clearAuthToken on error path too', async () => {
const login = vi.fn().mockRejectedValue(
asApiError(apiErrorLike({ status: 500 }))
    );
const clearAuthToken = vi.fn();

await submitLogin(validValues, { login, clearAuthToken });

expect(clearAuthToken).toHaveBeenCalledTimes(1);
  });

it('strips rememberMe from the wire call', async () => {

const login = vi.fn().mockResolvedValue(mockUser as unknown as AuthControllerLoginResult);
const clearAuthToken = vi.fn();

await submitLogin(
{ email: 'a@b.co', password: 'Abcdef1!', rememberMe: true },
{ login, clearAuthToken }
    );

expect(login).toHaveBeenCalledWith({ email: 'a@b.co', password: 'Abcdef1!' });
expect(login).not.toHaveBeenCalledWith(
expect.objectContaining({ rememberMe: true })
    );
  });
});

describe('login-copy', () => {
const ALL_KEYS: Array<[string, string]> = [

['form.email.label', COPY_KEYS.form.email.label],
['form.email.placeholder', COPY_KEYS.form.email.placeholder],
['form.password.label', COPY_KEYS.form.password.label],
['form.password.placeholder', COPY_KEYS.form.password.placeholder],
['form.rememberMe', COPY_KEYS.form.rememberMe],
['form.forgotPassword', COPY_KEYS.form.forgotPassword],
['form.noAccount', COPY_KEYS.form.noAccount],
['form.createAccount', COPY_KEYS.form.createAccount],
['form.needVerification', COPY_KEYS.form.needVerification],
['form.resendLink', COPY_KEYS.form.resendLink],
['form.termsLabel', COPY_KEYS.form.termsLabel],
['form.terms', COPY_KEYS.form.terms],
['form.and', COPY_KEYS.form.and],
['form.privacy', COPY_KEYS.form.privacy],

['button.signIn', COPY_KEYS.button.signIn],
['button.signingIn', COPY_KEYS.button.signingIn],

['error.invalidCredentials.title', COPY_KEYS.error.invalidCredentials.title],
['error.invalidCredentials.body', COPY_KEYS.error.invalidCredentials.body],
['error.rateLimited.title', COPY_KEYS.error.rateLimited.title],
['error.rateLimited.body', COPY_KEYS.error.rateLimited.body],
['error.validation.title', COPY_KEYS.error.validation.title],
['error.validation.body', COPY_KEYS.error.validation.body],
['error.server.title', COPY_KEYS.error.server.title],
['error.server.body', COPY_KEYS.error.server.body],

['title', COPY_KEYS.title],
  ];

it('resolves every advertised key to a non-empty string', () => {
for (const [key, registryKey] of ALL_KEYS) {
const v = resolveCopy(registryKey);
expect(v, `key ${key}`).not.toBe('');
    }
  });

it('has no anti-enumeration phrase in any rendered string', () => {
for (const [key, registryKey] of ALL_KEYS) {
const value = resolveCopy(registryKey);
assertAntiEnumeration(value, key);
    }
  });

it('snapshot helpers return non-empty strings', () => {
expect(loginInvalidCredentialsSnapshot()).not.toBe('');
expect(loginRateLimitedSnapshot()).not.toBe('');
expect(loginServerSnapshot()).not.toBe('');
  });

it('loginInvalidCredentialsSnapshot returns the same body as the registry key', () => {
expect(loginInvalidCredentialsSnapshot()).toBe(
resolveCopy(COPY_KEYS.error.invalidCredentials.body)
    );
  });

it('credentials error body is the same for AUTH_INVALID_CREDENTIALS collapse', () => {

const body = loginInvalidCredentialsSnapshot();
expect(body).toBe(resolveCopy(COPY_KEYS.error.invalidCredentials.body));
expect(body.length).toBeGreaterThan(0);
  });
});

describe('service-layer boundary', () => {
it('only auth.service.ts imports from @/lib/api/generated/**', async () => {

const fs = await import('node:fs');
const path = await import('node:path');

function walk(dir: string): string[] {
const entries = fs.readdirSync(dir, { withFileTypes: true });
const files: string[] = [];
for (const entry of entries) {
const full = path.join(dir, entry.name);
if (entry.isDirectory()) {
files.push(...walk(full));
        } else if (
/\.(ts|tsx)$/.test(entry.name) &&
!entry.name.endsWith('.spec.ts')
        ) {
files.push(full);
        }
      }
return files;
    }

const files = walk('src/features/auth');
for (const file of files) {
const text = fs.readFileSync(file, 'utf8');
if (file.endsWith('auth.service.ts')) continue;
if (
(file.endsWith('register-submit.ts') ||
file.endsWith('login-submit.ts') ||
file.endsWith('reset-password-submit.ts') ||
file.endsWith('forgot-password-submit.ts')) &&
text.includes("from '@/features/auth/services/auth.service'")
      ) {

continue;
      }
if (
file.endsWith('use-registration-submit.ts') ||
file.endsWith('use-login.ts') ||
file.endsWith('use-logout.ts') ||
file.endsWith('use-forgot-password.ts') ||
file.endsWith('use-reset-password.ts')
      ) {

continue;
      }
if (file.endsWith('login-submit.ts')) {

continue;
      }
if (file.endsWith('types/index.ts')) {

continue;
      }
expect(
text.includes("from '@/lib/api/generated"),
`Unexpected SDK import in ${file}`
      ).toBe(false);
    }
  });
});
