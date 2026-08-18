

import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useNotificationFeatureFlag } from '@/features/notifications/hooks/useNotificationFeatureFlag';

const mockGetFeatureFlagValue = vi.fn();
vi.mock('@/lib/feature-flags', () => ({
getFeatureFlagValue: (...args: unknown[]) => mockGetFeatureFlagValue(...args),
}));

describe('useNotificationFeatureFlag', () => {
beforeEach(() => {
vi.clearAllMocks();
  });

afterEach(() => {
vi.restoreAllMocks();
  });

it('returns isPlaceholder=true when flag is placeholder', () => {
mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

const { result } = renderHook(() => useNotificationFeatureFlag());

expect(result.current.isPlaceholder).toBe(true);
expect(result.current.flagValue).toBe('placeholder');
  });

it('returns isPlaceholder=false when flag is live', () => {
mockGetFeatureFlagValue.mockReturnValueOnce('live');

const { result } = renderHook(() => useNotificationFeatureFlag());

expect(result.current.isPlaceholder).toBe(false);
expect(result.current.flagValue).toBe('live');
  });

it('forwards the flag value verbatim', () => {
mockGetFeatureFlagValue.mockReturnValueOnce('placeholder');

const { result } = renderHook(() => useNotificationFeatureFlag());
expect(result.current.flagValue).toBe('placeholder');
  });

it('always returns a defined flagValue', () => {
mockGetFeatureFlagValue.mockReturnValueOnce('live');

const { result } = renderHook(() => useNotificationFeatureFlag());
expect(result.current.flagValue).toBeDefined();
expect(['live', 'placeholder']).toContain(result.current.flagValue);
  });
});
