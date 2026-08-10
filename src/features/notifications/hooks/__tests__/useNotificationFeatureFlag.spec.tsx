/**
 * `useNotificationFeatureFlag.spec.tsx` — locks the feature-flag check hook.
 *
 * Source epic:   Epic 5.1 — SDK coverage & realtime contract foundation.
 * Source story:  5.4 — Live notification stream and notification center.
 * Source ticket: TKT-5.4.G1.
 *
 * Tests cover:
 * - returns isPlaceholder=true when notifications_live === 'placeholder'
 * - returns isPlaceholder=false when notifications_live === 'live'
 * - flagValue reflects the underlying flag value
 */

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
