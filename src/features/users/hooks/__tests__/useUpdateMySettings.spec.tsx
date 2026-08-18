

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeProfileChannel } from '@/lib/api/core/profile-broadcast-channel';

import { useUpdateMySettings } from '../useUpdateMySettings';

beforeEach(() => {
closeProfileChannel();
});

afterEach(() => {
closeProfileChannel();
vi.clearAllMocks();
});

describe('useUpdateMySettings', () => {
describe('return shape', () => {
it('returns mutate, isPending, isSuccess, isError, lastError, lastApiError, resetError', () => {
const { result } = renderHook(() => useUpdateMySettings());
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
const { result } = renderHook(() => useUpdateMySettings());
expect(result.current.isPending).toBe(false);
    });

it('isSuccess is false before any call', () => {
const { result } = renderHook(() => useUpdateMySettings());
expect(result.current.isSuccess).toBe(false);
    });

it('isError is false before any call', () => {
const { result } = renderHook(() => useUpdateMySettings());
expect(result.current.isError).toBe(false);
    });

it('lastError is null before any call', () => {
const { result } = renderHook(() => useUpdateMySettings());
expect(result.current.lastError).toBeNull();
    });
  });

describe('options acceptance', () => {
it('accepts empty options', () => {
const { result } = renderHook(() => useUpdateMySettings({}));
expect(result.current).toHaveProperty('mutate');
    });

it('accepts onSuccess callback', () => {
const onSuccess = vi.fn();
const { result } = renderHook(() => useUpdateMySettings({ onSuccess }));
expect(result.current).toHaveProperty('mutate');
    });

it('accepts onError callback', () => {
const onError = vi.fn();
const { result } = renderHook(() => useUpdateMySettings({ onError }));
expect(result.current).toHaveProperty('mutate');
    });
  });
});
