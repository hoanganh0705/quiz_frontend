import { afterEach, describe, expect, it, vi } from 'vitest';

async function importFresh(): Promise<{
  getServerFeatureFlag: <K extends 'dailyChallengePage' | 'authoring_live'>(
    flag: K,
  ) => 'v1' | 'placeholder' | 'live';
}> {
  vi.resetModules();
  return await import('@/lib/feature-flags/getServerFeatureFlag');
}

describe('getServerFeatureFlag', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('returns the default when no env override is set', async () => {
    vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', undefined);
    const { getServerFeatureFlag } = await importFresh();
    expect(getServerFeatureFlag('dailyChallengePage')).toBe('v1');
  });

  it('returns the env override when present', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTHORING_LIVE', 'live');
    const { getServerFeatureFlag } = await importFresh();
    expect(getServerFeatureFlag('authoring_live')).toBe('live');
  });

  it('falls back to the default when the env value is invalid', async () => {
    vi.stubEnv('NEXT_PUBLIC_AUTHORING_LIVE', 'unsupported-value');
    const { getServerFeatureFlag } = await importFresh();
    expect(getServerFeatureFlag('authoring_live')).toBe('placeholder');
  });
});