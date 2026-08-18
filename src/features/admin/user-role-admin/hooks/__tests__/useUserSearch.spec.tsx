

import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: vi.fn().mockReturnValue('live'),
}));

vi.mock('swr', () => ({
default: vi.fn(),
}));

import { useUserSearch, USER_SEARCH_DEBOUNCE_MS, USER_SEARCH_MIN_QUERY_LENGTH } from '../useUserSearch';

describe('useUserSearch', () => {
beforeEach(() => {
vi.clearAllMocks();
vi.useFakeTimers();
  });

afterEach(() => {
vi.useRealTimers();
  });

it('returns fallback when flag is placeholder', async () => {
const { getFeatureFlagValue } = await import('@/lib/feature-flags');
vi.mocked(getFeatureFlagValue).mockReturnValue('placeholder');

const { result } = renderHook(() => useUserSearch('test'));

expect(result.current.users).toEqual([]);
expect(result.current.total).toBe(0);
expect(result.current.isLoading).toBe(false);
expect(result.current.error).toBeNull();
  });

it('returns fallback when query is too short', () => {
const { result } = renderHook(() => useUserSearch('a'));

expect(result.current.users).toEqual([]);
expect(result.current.isLoading).toBe(false);
  });

it('returns fallback when query is empty', () => {
const { result } = renderHook(() => useUserSearch(''));

expect(result.current.users).toEqual([]);
expect(result.current.isLoading).toBe(false);
  });

it('has correct debounce delay constant', () => {
expect(USER_SEARCH_DEBOUNCE_MS).toBe(300);
  });

it('has correct minimum query length constant', () => {
expect(USER_SEARCH_MIN_QUERY_LENGTH).toBe(2);
  });
});
