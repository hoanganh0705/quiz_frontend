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

const phase5Flags = [
  'phase5_realtime_infrastructure',
  'phase5_tournaments',
  'phase5_notifications',
  'phase5_instances',
  'phase5_rankings',
  'phase5_achievements',
  'phase5_search',
] as const;

const phase5EnvVars = {
  phase5_realtime_infrastructure: 'NEXT_PUBLIC_PHASE5_REALTIME_INFRASTRUCTURE',
  phase5_tournaments: 'NEXT_PUBLIC_PHASE5_TOURNAMENTS',
  phase5_notifications: 'NEXT_PUBLIC_PHASE5_NOTIFICATIONS',
  phase5_instances: 'NEXT_PUBLIC_PHASE5_INSTANCES',
  phase5_rankings: 'NEXT_PUBLIC_PHASE5_RANKINGS',
  phase5_achievements: 'NEXT_PUBLIC_PHASE5_ACHIEVEMENTS',
  phase5_search: 'NEXT_PUBLIC_PHASE5_SEARCH',
} as const;

/**
 * Phase 6 social graph & discovery hub flags — added by TKT-6.1.B1.
 * Updated by TKT-6.4.A2 to include the two Story 6.4 sub-lane gates
 * (`phase6_social_mutuals`, `phase6_social_activity`).
 *
 * Includes the `phase6_social` parent gate plus the four sub-lane
 * gates from Epic 6.1 (`relationship`, `feed`, `discovery`,
 * `notifications`) and the two sub-lane gates from Epic 6.4
 * (`mutuals`, `activity`). Each flag is exercised with the same
 * six-case pattern as Phase 4 / 5.
 */
const phase6Flags = [
  'phase6_social',
  'phase6_social_relationship',
  'phase6_social_feed',
  'phase6_social_discovery',
  'phase6_social_notifications',
  'phase6_social_mutuals',
  'phase6_social_activity',
] as const;

const phase6EnvVars = {
  phase6_social: 'NEXT_PUBLIC_PHASE6_SOCIAL',
  phase6_social_relationship: 'NEXT_PUBLIC_PHASE6_SOCIAL_RELATIONSHIP',
  phase6_social_feed: 'NEXT_PUBLIC_PHASE6_SOCIAL_FEED',
  phase6_social_discovery: 'NEXT_PUBLIC_PHASE6_SOCIAL_DISCOVERY',
  phase6_social_notifications: 'NEXT_PUBLIC_PHASE6_SOCIAL_NOTIFICATIONS',
  phase6_social_mutuals: 'NEXT_PUBLIC_PHASE6_SOCIAL_MUTUALS',
  phase6_social_activity: 'NEXT_PUBLIC_PHASE6_SOCIAL_ACTIVITY',
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

/**
 * Phase 5 realtime and feature gates — added by TKT-5.1.B1.
 *
 * Same six cases per flag as the Phase 4 spec. The shared
 * "barrel / implementation equivalence" case is already asserted
 * globally at the top of the file.
 */
for (const flag of phase5Flags) {
  describe(`feature-flags — ${flag}`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('(1) defaults to "placeholder" when the env-var is unset', async () => {
      vi.stubEnv(phase5EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase5EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase5EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase5EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase5EnvVars[flag], undefined);
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      vi.stubEnv(phase5EnvVars[flag], 'live');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase5EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

/**
 * Phase 6 social graph & discovery hub flags — added by TKT-6.1.B1.
 *
 * Same six cases per flag as the Phase 4 / 5 spec. The shared
 * "barrel / implementation equivalence" case is already asserted
 * globally at the top of the file.
 */
for (const flag of phase6Flags) {
  describe(`feature-flags — ${flag}`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('(1) defaults to "placeholder" when the env-var is unset', async () => {
      vi.stubEnv(phase6EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase6EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase6EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase6EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase6EnvVars[flag], undefined);
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      vi.stubEnv(phase6EnvVars[flag], 'live');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase6EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

/**
 * Phase 6 social sub-flags must reference `phase6_social` as their
 * prerequisite — this is acceptance criterion #2 of TKT-6.1.B1 and a
 * cross-batch invariant of Epic 6.1. The parent gate stays on its own;
 * this test pins the documented relationship so a future refactor that
 * loses the dependency will fail here.
 *
 * The dependency is documented in the per-flag JSDoc on
 * `phase6_social_relationship`, `phase6_social_feed`,
 * `phase6_social_discovery`, and `phase6_social_notifications`.
 */
describe('feature-flags — Phase 6 sub-flag prerequisites', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('every phase6_social_* sub-flag is documented as requiring phase6_social', () => {
    expect(featureFlagsImpl.FEATURE_FLAGS).toContain('phase6_social');
    for (const sub of [
      'phase6_social_relationship',
      'phase6_social_feed',
      'phase6_social_discovery',
      'phase6_social_notifications',
    ] as const) {
      expect(featureFlagsImpl.FEATURE_FLAGS).toContain(sub);
    }
  });

  it('phase6_social default is "placeholder" with no env-var override', async () => {
    vi.stubEnv('NEXT_PUBLIC_PHASE6_SOCIAL', undefined);
    const mod = await importFresh();
    expect(mod.getFeatureFlagValue('phase6_social')).toBe('placeholder');
  });
});

/**
 * Phase 7 admin flags — added by TKT-7.1.B1.
 *
 * Eight flags: the `phase7_admin` parent gate plus seven sub-lane
 * gates (`review_moderation`, `comment_moderation`, `tag`,
 * `category`, `ranking`, `achievement`, `tournament`, `user_role`).
 * Each is exercised with the same six-case pattern as Phase 4 / 5 / 6.
 */
const phase7Flags = [
  'phase7_admin',
  'phase7_admin_review_moderation',
  'phase7_admin_comment_moderation',
  'phase7_admin_tag',
  'phase7_admin_category',
  'phase7_admin_ranking',
  'phase7_admin_achievement',
  'phase7_admin_tournament',
  'phase7_admin_user_role',
] as const;

const phase7EnvVars = {
  phase7_admin: 'NEXT_PUBLIC_PHASE7_ADMIN',
  phase7_admin_review_moderation: 'NEXT_PUBLIC_PHASE7_ADMIN_REVIEW_MODERATION',
  phase7_admin_comment_moderation: 'NEXT_PUBLIC_PHASE7_ADMIN_COMMENT_MODERATION',
  phase7_admin_tag: 'NEXT_PUBLIC_PHASE7_ADMIN_TAG',
  phase7_admin_category: 'NEXT_PUBLIC_PHASE7_ADMIN_CATEGORY',
  phase7_admin_ranking: 'NEXT_PUBLIC_PHASE7_ADMIN_RANKING',
  phase7_admin_achievement: 'NEXT_PUBLIC_PHASE7_ADMIN_ACHIEVEMENT',
  phase7_admin_tournament: 'NEXT_PUBLIC_PHASE7_ADMIN_TOURNAMENT',
  phase7_admin_user_role: 'NEXT_PUBLIC_PHASE7_ADMIN_USER_ROLE',
} as const;

for (const flag of phase7Flags) {
  describe(`feature-flags — ${flag}`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('(1) defaults to "placeholder" when the env-var is unset', async () => {
      vi.stubEnv(phase7EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase7EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase7EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('placeholder');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase7EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase7EnvVars[flag], undefined);
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      vi.stubEnv(phase7EnvVars[flag], 'live');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase7EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

/**
 * Phase 7 admin sub-flags must reference `phase7_admin` as their
 * prerequisite — this is acceptance criterion #2 of TKT-7.1.B1 and a
 * cross-batch invariant of Epic 7.1. The parent gate stays on its own;
 * this test pins the documented relationship so a future refactor that
 * loses the dependency will fail here.
 */
describe('feature-flags — Phase 7 admin sub-flag prerequisites', () => {
  it('every phase7_admin_* sub-flag is documented as requiring phase7_admin', () => {
    expect(featureFlagsImpl.FEATURE_FLAGS).toContain('phase7_admin');
    for (const sub of [
      'phase7_admin_review_moderation',
      'phase7_admin_comment_moderation',
      'phase7_admin_tag',
      'phase7_admin_category',
      'phase7_admin_ranking',
      'phase7_admin_achievement',
      'phase7_admin_tournament',
      'phase7_admin_user_role',
    ] as const) {
      expect(featureFlagsImpl.FEATURE_FLAGS).toContain(sub);
    }
  });
});
