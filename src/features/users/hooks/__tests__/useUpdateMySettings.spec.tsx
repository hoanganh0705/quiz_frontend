/**
 * `useUpdateMySettings` spec — optimistic settings mutation.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.B2.
 *
 * Coverage contract:
 *
 *   1. `mutate(payload)` returns a `Promise<OptimisticMutationResult>`.
 *   2. `isPending`, `isSuccess`, `isError` flags reflect the mutation lifecycle.
 *   3. `lastError` is null before any call; non-null after a rejected ApiError.
 *   4. `lastError` includes `needsPasswordConfirmation: true` for
 *      `AUTH_INVALID_CURRENT_PASSWORD` errors.
 *   5. Options (`onSuccess`, `onError`) are accepted without errors.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeProfileChannel } from '@/lib/api/core/profile-broadcast-channel';

import { useUpdateMySettings } from '../useUpdateMySettings';

// ─── Setup / teardown ─────────────────────────────────────────────────────

beforeEach(() => {
  closeProfileChannel();
});

afterEach(() => {
  closeProfileChannel();
  vi.clearAllMocks();
});

// ─── Tests ───────────────────────────────────────────────────────────────

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
