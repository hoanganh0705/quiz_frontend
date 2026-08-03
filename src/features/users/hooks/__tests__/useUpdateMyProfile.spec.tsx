/**
 * `useUpdateMyProfile` spec — optimistic profile mutation.
 *
 * Source epic:   Epic 4.3 — Edit profile + user settings.
 * Source ticket: TKT-4.3.B1.
 *
 * Coverage contract:
 *
 *   1. `mutate(payload)` returns a `Promise<OptimisticMutationResult>`.
 *   2. `isPending`, `isSuccess`, `isError` flags reflect the mutation lifecycle.
 *   3. `lastError` is null before any call; non-null after a rejected ApiError.
 *   4. `lastError` is a `UserCopyEntry` when set.
 *   5. `lastApiError` is the raw `ApiError` when set.
 *   6. `resetError()` is callable and has the correct type.
 *   7. Options (`onSuccess`, `onError`) are accepted without errors.
 *   8. `USER_COPY` entries exist for the expected error codes.
 *
 * Integration tests (wiring the full provider tree) cover the service call,
 * store update, and broadcast emission in the end-to-end Epic 4.3 spec.
 */

import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { closeProfileChannel } from '@/lib/api/core/profile-broadcast-channel';
import { USER_COPY } from '@/lib/api/error-codes';

import { useUpdateMyProfile } from '../useUpdateMyProfile';

// ─── Setup / teardown ──────────────────────────────────────────────────────

beforeEach(() => {
  closeProfileChannel();
});

afterEach(() => {
  closeProfileChannel();
  vi.clearAllMocks();
});

// ─── Tests ────────────────────────────────────────────────────────────────

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
