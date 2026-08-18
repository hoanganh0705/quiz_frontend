

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as featureFlagsImplStatic from '@/lib/feature-flags/feature-flags'
import * as featureFlagsBarrelStatic from '@/lib/feature-flags'

async function importFresh() {
vi.resetModules()
return await import('@/lib/feature-flags/feature-flags')
}

describe('feature-flags — dailyChallengePage default', () => {
beforeEach(() => {
vi.unstubAllEnvs()
  })

afterEach(() => {
vi.unstubAllEnvs()
  })

it('(1) defaults to "placeholder" when the env-var is unset', async () => {
vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', undefined)
const { getFeatureFlagValue } = await importFresh()
expect(getFeatureFlagValue('dailyChallengePage')).toBe('placeholder')
  })

it('(2) returns "v1" when the env-var is set to "v1"', async () => {
vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', 'v1')
const { getFeatureFlagValue } = await importFresh()
expect(getFeatureFlagValue('dailyChallengePage')).toBe('v1')
  })

it('(3) returns the default when the env-var is an unsupported value', async () => {
vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', 'unsupported-value')
const { getFeatureFlagValue } = await importFresh()
expect(getFeatureFlagValue('dailyChallengePage')).toBe('placeholder')
  })

it('(4) isFeatureEnabled returns the correct boolean for each value', async () => {
vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', 'v1')
const enabled = await importFresh()
expect(enabled.isFeatureEnabled('dailyChallengePage', 'v1')).toBe(true)
expect(enabled.isFeatureEnabled('dailyChallengePage', 'placeholder')).toBe(
false,
    )

vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', undefined)
const disabled = await importFresh()
expect(disabled.isFeatureEnabled('dailyChallengePage', 'v1')).toBe(false)
expect(
disabled.isFeatureEnabled('dailyChallengePage', 'placeholder'),
    ).toBe(true)
  })

it('(5) isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', 'v1')
const overridden = await importFresh()
expect(overridden.isFeatureEnabled('dailyChallengePage')).toBe(true)

vi.stubEnv('NEXT_PUBLIC_DAILY_CHALLENGE_PAGE', undefined)
const atDefault = await importFresh()
expect(atDefault.isFeatureEnabled('dailyChallengePage')).toBe(false)
  })

it('(6) the module is importable from both the barrel and the implementation path', () => {
expect(featureFlagsBarrelStatic.getFeatureFlagValue).toBe(
featureFlagsImplStatic.getFeatureFlagValue,
    )
expect(featureFlagsBarrelStatic.isFeatureEnabled).toBe(
featureFlagsImplStatic.isFeatureEnabled,
    )
expect(featureFlagsBarrelStatic.FEATURE_FLAGS).toEqual(
featureFlagsImplStatic.FEATURE_FLAGS,
    )
  })
})
