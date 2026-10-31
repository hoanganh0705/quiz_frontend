import { renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type FeatureFlagModule = typeof import('@/lib/feature-flags/feature-flag-context');

async function importFresh(): Promise<FeatureFlagModule> {
  vi.resetModules();
  return await import('@/lib/feature-flags/feature-flag-context');
}

describe('FeatureFlagProvider + useFeatureFlag', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('throws when used outside of a provider', async () => {
    const { useFeatureFlag } = await importFresh();
    expect(() => renderHook(() => useFeatureFlag('dailyChallengePage'))).toThrow(
      /must be called inside <FeatureFlagProvider>/,
    );
  });

  it('returns the default value when no env override is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', undefined);
    const { FeatureFlagProvider, useFeatureFlag } = await importFresh();
    const { result } = renderHook(() => useFeatureFlag('dailyChallengePage'), {
      wrapper: FeatureFlagProvider,
    });
    expect(result.current).toBe('v1');
  });

  it('returns the env-override value when one is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', 'placeholder');
    const { FeatureFlagProvider, useFeatureFlag } = await importFresh();
    const { result } = renderHook(() => useFeatureFlag('dailyChallengePage'), {
      wrapper: FeatureFlagProvider,
    });
    expect(result.current).toBe('placeholder');
  });

  it('reads each flag independently', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTHORING_LIVE', 'live');
    const { FeatureFlagProvider, useFeatureFlag } = await importFresh();
    const { result } = renderHook(
      () => ({
        authored: useFeatureFlag('authoring_live'),
        daily: useFeatureFlag('dailyChallengePage'),
      }),
      { wrapper: FeatureFlagProvider },
    );
    expect(result.current.authored).toBe('live');
    expect(result.current.daily).toBe('v1');
  });
});