

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeProfileChannel } from '@/lib/api/core/profile-broadcast-channel';
import { USER_COPY } from '@/lib/api/error-codes';

import { useUpdateMyProfile } from '../useUpdateMyProfile';

beforeEach(() => {
closeProfileChannel();
});

afterEach(() => {
closeProfileChannel();
vi.clearAllMocks();
});

describe('useUpdateMyProfile', () => {
describe('return shape', () => {
it('returns mutate, isPending, isSuccess, isError, lastError, lastApiError, resetError', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current).toHaveProperty('mutate');
expect(typeof result.current.mutate).toBe('function');
expect(typeof result.current.isPending).toBe('boolean');
expect(typeof result.current.isSuccess).toBe('boolean');
expect(typeof result.current.isError).toBe('boolean');
expect(result.current).toHaveProperty('lastError');
expect(result.current).toHaveProperty('lastApiError');
expect(typeof result.current.resetError).toBe('function');
    });

it('isPending is false before any call', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current.isPending).toBe(false);
    });

it('isSuccess is false before any call', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current.isSuccess).toBe(false);
    });

it('isError is false before any call', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current.isError).toBe(false);
    });

it('lastError is null before any call', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current.lastError).toBeNull();
    });

it('lastApiError is null before any call', () => {
const { result } = renderHook(() => useUpdateMyProfile());
expect(result.current.lastApiError).toBeNull();
    });
  });

describe('options acceptance', () => {
it('accepts empty options', () => {
const { result } = renderHook(() => useUpdateMyProfile({}));
expect(result.current).toHaveProperty('mutate');
    });

it('accepts onSuccess callback', () => {
const onSuccess = vi.fn();
const { result } = renderHook(() => useUpdateMyProfile({ onSuccess }));
expect(result.current).toHaveProperty('mutate');
    });

it('accepts onError callback', () => {
const onError = vi.fn();
const { result } = renderHook(() => useUpdateMyProfile({ onError }));
expect(result.current).toHaveProperty('mutate');
    });

it('accepts both callbacks', () => {
const onSuccess = vi.fn();
const onError = vi.fn();
const { result } = renderHook(() =>
useUpdateMyProfile({ onSuccess, onError }),
      );
expect(result.current).toHaveProperty('mutate');
    });
  });

describe('USER_COPY coverage for expected error codes', () => {
it('has USER_COPY entries for the expected error codes', () => {
const codes = ['GLOBAL_CONFLICT', 'GLOBAL_VALIDATION_FAILED', 'GLOBAL_RATE_LIMITED'] as const;
for (const code of codes) {
const entry = USER_COPY[code as keyof typeof USER_COPY];
expect(entry).toBeDefined();
      }
    });
  });
});
