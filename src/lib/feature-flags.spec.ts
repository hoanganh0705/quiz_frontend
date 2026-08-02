/**
 * Feature-flags module — locks the contract for the first
 * project-wide consumer (Story 3.12 / TKT-3.12.A2).
 *
 * Six cases per the ticket's testing checklist:
 *
 *   (1) Default value is `placeholder` when the env-var is unset.
 *   (2) Env-var override to `v1` returns `v1`.
 *   (3) Env-var override to an unsupported value falls back to the
 *       default (`placeholder`).
 *   (4) `isFeatureEnabled` returns the correct boolean for each value.
 *   (5) `isFeatureEnabled(flag)` without a `value` argument returns
 *       `true` only when an env-var override is active (inverse of
 *       "is the flag still at its default value").
 *   (6) The module is importable from both the barrel
 *       (`@/lib/feature-flags`) and the implementation file
 *       (`@/lib/feature-flags/feature-flags`) — both paths resolve to
 *       the same exports.
 *
 * The test mutates `process.env.NEXT_PUBLIC_DAILY_CHALLENGE_PAGE` and
 * re-imports the module under a fresh module id (`vi.resetModules()`)
 * so the module init time reads the updated env-var. The
 * `vi.unstubAllEnvs` in `afterEach` keeps the env clean between tests.
 *
 * The `@/lib/feature-flags` and `@/lib/feature-flags/feature-flags`
 * imports are resolved through the `vitest.config.ts` `resolve.alias`
 * entry — the same alias consumers use at runtime.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import * as featureFlagsImplStatic from '@/lib/feature-flags/feature-flags'
import * as featureFlagsBarrelStatic from '@/lib/feature-flags'

/**
 * Re-import the module under a fresh module id so the env-var override
 * is honored at module init time. `vi.resetModules()` clears the
 * registry; the dynamic `import()` then resolves the file afresh.
 *
 * Implementation note: in vitest the project's `resolve.alias` maps
 * `@` → `./src` so `@/lib/feature-flags/feature-flags` resolves to
 * `<project-root>/src/lib/feature-flags/feature-flags.ts`.
 */
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
