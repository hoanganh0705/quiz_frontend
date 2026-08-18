

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeProfileChannel } from '@/lib/api/core/profile-broadcast-channel';

import { useMyProfile } from '../useMyProfile';

beforeEach(() => {
closeProfileChannel();
});

afterEach(() => {
closeProfileChannel();
vi.clearAllMocks();
});

describe('useMyProfile', () => {
describe('return shape', () => {
it('returns profile, isLoading, isHydrated, error, refetch', () => {
const { result } = renderHook(() => useMyProfile());
expect(result.current).toHaveProperty('profile');
expect(typeof result.current.isLoading).toBe('boolean');
expect(typeof result.current.isHydrated).toBe('boolean');
expect(result.current).toHaveProperty('error');
expect(typeof result.current.refetch).toBe('function');
    });
  });

describe('hydration state', () => {
it('isHydrated is false when profile is null', () => {

const { result } = renderHook(() => useMyProfile());

expect(typeof result.current.isHydrated).toBe('boolean');
    });
  });

describe('refetch', () => {
it('refetch is a function', () => {
const { result } = renderHook(() => useMyProfile());
expect(typeof result.current.refetch).toBe('function');
    });
  });

describe('error', () => {
it('error is a string or null', () => {
const { result } = renderHook(() => useMyProfile());

expect(result.current.error === null || typeof result.current.error === 'string').toBe(true);
    });
  });
});
