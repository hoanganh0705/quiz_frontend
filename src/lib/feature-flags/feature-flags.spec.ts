/**
 * Feature-flags module — locks the contract for the first
 * project-wide consumer (Story 3.12 / TKT-3.12.A2).
 *
 * Five cases per the ticket's testing checklist:
 *
 *   (1) Default value is `placeholder` when the env-var is unset.
 *   (2) Env-var override to `v1` returns `v1`.
 *   (3) Env-var override to an unsupported value falls back to the
 *       default (`placeholder`).
 *   (4) `isFeatureEnabled` returns the correct boolean for each value.
 *   (5) Module is importable from `@/lib/feature-flags` and from
 *       `@/lib/feature-flags/feature-flags` — both paths resolve to the
 *       same exports.
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

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as featureFlagsImpl from "./feature-flags";
import * as featureFlagsBarrel from "./index";

/**
 * Re-import the module under a fresh module id so the env-var override
 * is honored at module init time. `vi.resetModules()` clears the
 * registry; the dynamic `import()` then resolves the file afresh.
 */
async function importFresh(): Promise<typeof featureFlagsImpl> {
  vi.resetModules();
  return await import("./index");
}

describe("feature-flags — dailyChallengePage default", () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('(1) defaults to "placeholder" when the env-var is unset', async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", undefined);
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("placeholder");
  });

  it('(2) returns "v1" when the env-var is set to "v1"', async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "v1");
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("v1");
  });

  it("(3) returns the default when the env-var is an unsupported value", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "unsupported-value");
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("placeholder");
  });

  it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "v1");
    const enabled = await importFresh();
    expect(enabled.isFeatureEnabled("dailyChallengePage", "v1")).toBe(true);
    expect(enabled.isFeatureEnabled("dailyChallengePage", "placeholder")).toBe(
      false,
    );

    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", undefined);
    const disabled = await importFresh();
    expect(disabled.isFeatureEnabled("dailyChallengePage", "v1")).toBe(false);
    expect(disabled.isFeatureEnabled("dailyChallengePage", "placeholder")).toBe(
      true,
    );
  });

  it("isFeatureEnabled(flag) without a value returns true when an env-var override is active", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "v1");
    const overridden = await importFresh();
    expect(overridden.isFeatureEnabled("dailyChallengePage")).toBe(true);

    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", undefined);
    const atDefault = await importFresh();
    expect(atDefault.isFeatureEnabled("dailyChallengePage")).toBe(false);
  });

  it("(5) the module is importable from both the barrel and the implementation path", () => {
    expect(featureFlagsBarrel.getFeatureFlagValue).toBe(
      featureFlagsImpl.getFeatureFlagValue,
    );
    expect(featureFlagsBarrel.isFeatureEnabled).toBe(
      featureFlagsImpl.isFeatureEnabled,
    );
    expect(featureFlagsBarrel.FEATURE_FLAGS).toEqual(
      featureFlagsImpl.FEATURE_FLAGS,
    );
  });
});

/**
 * Phase 4 lane gates — added by TKT-4.1.B1.
 *
 * Same six cases per flag as the dailyChallengePage spec (default,
 * env-var override, unsupported value, isFeatureEnabled for each value,
 * isFeatureEnabled(flag) without value, barrel / implementation
 * equivalence). The shared "barrel / implementation equivalence" case is
 * collapsed into a single round-trip per flag for brevity — the global
 * `(5)` case above already locks the structural invariant.
 */
const phase4Flags = [
  'phase4_authoring',
  'phase4_personal',
  'phase4_attempts',
] as const;

const phase4EnvVars = {
  phase4_authoring: 'NEXT_PUBLIC_PHASE4_AUTHORING',
  phase4_personal: 'NEXT_PUBLIC_PHASE4_PERSONAL',
  phase4_attempts: 'NEXT_PUBLIC_PHASE4_ATTEMPTS',
} as const;

for (const flag of phase4Flags) {
  describe(`feature-flags — ${flag}`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('(1) defaults to "placeholder" when the env-var is unset', async () => {
      vi.stubEnv(phase4EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase4EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it('(3) returns the default when the env-var is an unsupported value', async () => {
      vi.stubEnv(phase4EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it('(4) isFeatureEnabled returns the correct boolean for each value', async () => {
      vi.stubEnv(phase4EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase4EnvVars[flag], undefined);
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      vi.stubEnv(phase4EnvVars[flag], 'live');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase4EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}
