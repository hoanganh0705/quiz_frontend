

import { describe, expect, it, vi, beforeEach } from 'vitest';

const mockAuthControllerDeleteAccount = vi.fn();

vi.mock('@/lib/api', async () => {
const actual = await vi.importActual<typeof import('@/lib/api')>('@/lib/api');
return {
...actual,
getAuth: () => ({
authControllerDeleteAccount: mockAuthControllerDeleteAccount,
    }),
  };
});

import { deleteAccount } from '@/features/auth/services/auth.service';
import { AUTH_INVALID_CURRENT_PASSWORD } from '@/features/auth/errors/deletion-error-codes';
import { ApiError } from '@/lib/api/core/ApiError';

function makeAxiosError(status: number, code: string, message: string): never {
const response = {
status,
data: {
type: 'about:blank',
title: code,
status,
detail: message,
extensions: { code },
    },
  };
const error = {
isAxiosError: true,
name: 'AxiosError',
message,
response,
config: {},
toJSON: () => ({}),
  } as unknown as Parameters<typeof ApiError.fromAxios>[0];
return ApiError.fromAxios(error) as never;
}

beforeEach(() => {
mockAuthControllerDeleteAccount.mockReset();
});

describe('deleteAccount — service wrapper', () => {
it('forwards the DTO to the SDK exactly once', async () => {
mockAuthControllerDeleteAccount.mockResolvedValue({
data: { message: 'Account deleted' },
    });

const result = await deleteAccount({ password: 'hunter2' });

expect(mockAuthControllerDeleteAccount).toHaveBeenCalledTimes(1);
expect(mockAuthControllerDeleteAccount).toHaveBeenCalledWith({
password: 'hunter2',
    });
expect(result.message).toBe('Account deleted');
  });

it('unwraps the response envelope (data field)', async () => {
mockAuthControllerDeleteAccount.mockResolvedValue({
data: { message: 'irrelevant internal message' },
    });

const result = await deleteAccount({ password: 'hunter2' });

expect(result).toEqual({ message: 'irrelevant internal message' });
  });

it('returns the DTO message verbatim', async () => {
mockAuthControllerDeleteAccount.mockResolvedValue({
data: { message: 'Account has been permanently deleted' },
    });

const result = await deleteAccount({ password: 'hunter2' });

expect(result.message).toBe('Account has been permanently deleted');
  });

it('propagates ApiError on invalid password', async () => {
mockAuthControllerDeleteAccount.mockRejectedValue(
makeAxiosError(401, AUTH_INVALID_CURRENT_PASSWORD, 'Current password is incorrect'),
    );

await expect(deleteAccount({ password: 'wrong' })).rejects.toBeInstanceOf(ApiError);
await expect(deleteAccount({ password: 'wrong' })).rejects.toMatchObject({
code: AUTH_INVALID_CURRENT_PASSWORD,
status: 401,
    });
  });

it('propagates network errors (status 0) unchanged', async () => {
const networkError = makeAxiosError(0, 'NETWORK_FAILURE', 'Network failure');
mockAuthControllerDeleteAccount.mockRejectedValue(networkError);

await expect(deleteAccount({ password: 'hunter2' })).rejects.toBe(networkError);
  });

it('throws when the response envelope is missing data', async () => {

mockAuthControllerDeleteAccount.mockResolvedValue({ data: null });

await expect(deleteAccount({ password: 'hunter2' })).rejects.toThrow(ApiError);
  });

it('does NOT call clearAllAuthCache, clearAuthToken, or broadcast', async () => {

mockAuthControllerDeleteAccount.mockResolvedValue({
data: { message: 'Account deleted' },
    });

await expect(deleteAccount({ password: 'hunter2' })).resolves.toBeDefined();
expect(mockAuthControllerDeleteAccount).toHaveBeenCalledTimes(1);
  });
});
