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

  it('(1) defaults to "v1" when the env-var is unset', async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", undefined);
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("v1");
  });

  it('(2) returns "v1" when the env-var is set to "v1"', async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "v1");
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("v1");
  });

  it("(3) returns the default ('v1') when the env-var is an unsupported value", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "unsupported-value");
    const { getFeatureFlagValue } = await importFresh();
    expect(getFeatureFlagValue("dailyChallengePage")).toBe("v1");
  });

  it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "v1");
    const enabled = await importFresh();
    expect(enabled.isFeatureEnabled("dailyChallengePage", "v1")).toBe(true);
    expect(enabled.isFeatureEnabled("dailyChallengePage", "placeholder")).toBe(
      false,
    );

    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "placeholder");
    const disabled = await importFresh();
    expect(disabled.isFeatureEnabled("dailyChallengePage", "v1")).toBe(false);
    expect(disabled.isFeatureEnabled("dailyChallengePage", "placeholder")).toBe(
      true,
    );
  });

  it("isFeatureEnabled(flag) without a value returns true when an env-var override is active", async () => {
    // Setting an *explicit* override (any supported value other than
    // the default) flips the override-active detection to true.
    vi.stubEnv("NEXT_PUBLIC_DAILY_CHALLENGE_PAGE", "placeholder");
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
  'authoring_live',
  'personal_area_live',
  'attempts_live',
] as const;

const phase4EnvVars = {
  authoring_live: 'NEXT_PUBLIC_AUTHORING_LIVE',
  personal_area_live: 'NEXT_PUBLIC_PERSONAL_AREA_LIVE',
  attempts_live: 'NEXT_PUBLIC_ATTEMPTS_LIVE',
} as const;

/**
 * Phase 5 surface gates — every Phase 5 surface flag now defaults to
 * `'live'` because every shipped Phase 5 surface (notifications bell +
 * popover, realtime bridge, tournaments list + detail + registration,
 * multiplayer instance lobby + play, rankings leaderboard + history +
 * milestones, achievements gallery + earned + history, search results)
 * is wired end-to-end and the only thing keeping it from rendering in
 * the default config was the `'placeholder'` flag default. With this
 * flip, the `'placeholder'` branch in every Phase 5 page is exercised
 * only when an explicit `NEXT_PUBLIC_*_LIVE=placeholder` env-var
 * override is set.
 *
 * The same six-case pattern (default, env-var override, unsupported
 * value, isFeatureEnabled for each value, override-active detection)
 * still applies, with the default-case expectations inverted to match
 * the `'live'` contract — same shape as the Phase 7 live-by-default
 * admin flags. The shared "barrel / implementation equivalence" case
 * is collapsed into a single round-trip per flag for brevity — the
 * global `(5)` case at the top of the file already locks the
 * structural invariant.
 */
const phase5LiveByDefaultFlags = [
  'realtime_infrastructure_live',
  'notifications_live',
  'tournaments_live',
  'multiplayer_instances_live',
  'multiplayer_play_live',
  'rankings_live',
  'achievements_live',
  'search_live',
] as const;

const phase5EnvVars = {
  realtime_infrastructure_live: 'NEXT_PUBLIC_REALTIME_INFRASTRUCTURE_LIVE',
  tournaments_live: 'NEXT_PUBLIC_TOURNAMENTS_LIVE',
  notifications_live: 'NEXT_PUBLIC_NOTIFICATIONS_LIVE',
  multiplayer_instances_live: 'NEXT_PUBLIC_MULTIPLAYER_INSTANCES_LIVE',
  multiplayer_play_live: 'NEXT_PUBLIC_MULTIPLAYER_PLAY_LIVE',
  rankings_live: 'NEXT_PUBLIC_RANKINGS_LIVE',
  achievements_live: 'NEXT_PUBLIC_ACHIEVEMENTS_LIVE',
  search_live: 'NEXT_PUBLIC_SEARCH_LIVE',
} as const;

/**
 * Phase 6 social graph & discovery hub flags — added by TKT-6.1.B1.
 * Updated by TKT-6.4.A2 to include the two Story 6.4 sub-lane gates
 * (`social_mutuals_live`, `social_activity_live`).
 *
 * Includes the `social_live` parent gate plus ten sub-lane gates
 * covering Epic 6.1 (relationship, feed, discovery, notifications),
 * Epic 6.4 (mutuals, activity), Epic 6.5 (user search), and Epic 6.7
 * / 6.8 (follow / block / friend-request mutations). Every Phase 6
 * surface is wired end-to-end, so all eleven flags default to
 * `'live'`. The `'placeholder'` branch in every Phase 6 page is
 * exercised only when an explicit
 * `NEXT_PUBLIC_SOCIAL_*_LIVE=placeholder` env-var override is set.
 *
 * Each flag is exercised with the same six-case pattern as Phase 4,
 * with the default-case expectations inverted to match the `'live'`
 * contract — same shape as the Phase 5 / Phase 7 live-by-default
 * sections. The shared "barrel / implementation equivalence" case
 * is already asserted globally at the top of the file.
 */
const phase6LiveByDefaultFlags = [
  'social_live',
  'social_relationship_live',
  'social_feed_live',
  'social_discovery_live',
  'social_realtime_notifications_live',
  'social_mutuals_live',
  'social_activity_live',
  'social_user_search_live',
  'social_follow_mutation_live',
  'social_block_mutation_live',
  'social_friend_request_mutation_live',
] as const;

const phase6EnvVars = {
  social_live: 'NEXT_PUBLIC_SOCIAL_LIVE',
  social_relationship_live: 'NEXT_PUBLIC_SOCIAL_RELATIONSHIP_LIVE',
  social_feed_live: 'NEXT_PUBLIC_SOCIAL_FEED_LIVE',
  social_discovery_live: 'NEXT_PUBLIC_SOCIAL_DISCOVERY_LIVE',
  social_realtime_notifications_live: 'NEXT_PUBLIC_SOCIAL_REALTIME_NOTIFICATIONS_LIVE',
  social_mutuals_live: 'NEXT_PUBLIC_SOCIAL_MUTUALS_LIVE',
  social_activity_live: 'NEXT_PUBLIC_SOCIAL_ACTIVITY_LIVE',
  social_user_search_live: 'NEXT_PUBLIC_SOCIAL_USER_SEARCH_LIVE',
  social_follow_mutation_live: 'NEXT_PUBLIC_SOCIAL_FOLLOW_MUTATION_LIVE',
  social_block_mutation_live: 'NEXT_PUBLIC_SOCIAL_BLOCK_MUTATION_LIVE',
  social_friend_request_mutation_live: 'NEXT_PUBLIC_SOCIAL_FRIEND_REQUEST_MUTATION_LIVE',
} as const;

for (const flag of phase6LiveByDefaultFlags) {
  describe(`feature-flags — ${flag} (live by default)`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("(1) defaults to 'live' when the env-var is unset", async () => {
      vi.stubEnv(phase6EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase6EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default ('live') when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase6EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase6EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase6EnvVars[flag], 'placeholder');
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      // Setting an *explicit* override (any supported value other than
      // the default) flips the override-active detection to true.
      vi.stubEnv(phase6EnvVars[flag], 'placeholder');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase6EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

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
 * Phase 5 flags that default to `'live'` — their test suite inverts the
 * default-case expectations so the spec continues to pin the new
 * contract.
 *
 * All eight Phase 5 surface flags default to `'live'` because every
 * shipped Phase 5 surface is wired end-to-end. The override-active
 * detection still returns `true` when an env-var *changes* the value
 * (e.g. setting `NEXT_PUBLIC_NOTIFICATIONS_LIVE=placeholder` in CI).
 */
for (const flag of phase5LiveByDefaultFlags) {
  describe(`feature-flags — ${flag} (live by default)`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("(1) defaults to 'live' when the env-var is unset", async () => {
      vi.stubEnv(phase5EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase5EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default ('live') when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase5EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase5EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase5EnvVars[flag], 'placeholder');
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      // Setting an *explicit* override (any supported value other than
      // the default) flips the override-active detection to true.
      vi.stubEnv(phase5EnvVars[flag], 'placeholder');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase5EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

/**
 * Phase 6 social sub-flags must reference `social_live` as their
 * prerequisite — this is acceptance criterion #2 of TKT-6.1.B1 and a
 * cross-batch invariant of Epic 6.1. The parent gate stays on its own;
 * this test pins the documented relationship so a future refactor that
 * loses the dependency will fail here.
 *
 * The dependency is documented in the per-flag JSDoc on
 * `social_relationship_live`, `social_feed_live`,
 * `social_discovery_live`, and `social_realtime_notifications_live`.
 */
describe('feature-flags — Phase 6 sub-flag prerequisites', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('every social_live_* sub-flag is documented as requiring social_live', () => {
    expect(featureFlagsImpl.FEATURE_FLAGS).toContain('social_live');
    for (const sub of [
      'social_relationship_live',
      'social_feed_live',
      'social_discovery_live',
      'social_realtime_notifications_live',
      'social_mutuals_live',
      'social_activity_live',
      'social_user_search_live',
      'social_follow_mutation_live',
      'social_block_mutation_live',
      'social_friend_request_mutation_live',
    ] as const) {
      expect(featureFlagsImpl.FEATURE_FLAGS).toContain(sub);
    }
  });

  it("social_live default is 'live' with no env-var override", async () => {
    vi.stubEnv('NEXT_PUBLIC_SOCIAL_LIVE', undefined);
    const mod = await importFresh();
    expect(mod.getFeatureFlagValue('social_live')).toBe('live');
  });
});

/**
 * Phase 7 admin flags — added by TKT-7.1.B1.
 *
 * Eleven flags: the `admin_live` parent gate plus ten sub-lane
 * gates (`review_moderation`, `comment_moderation`, `tag`,
 * `category`, `ranking`, `achievement`, `tournament`, `user_role`,
 * `audit`).  All eleven default to `'live'` because every Phase 7
 * admin surface is wired and reachable from the admin shell —
 * the previously-defaulted `'placeholder'` rendered an
 * `EmptyState` that visually replaced the entire admin shell
 * (header, sidebar, content) with a single card, making the
 * `/admin` URL appear to "bounce back" to `/`. The six-case
 * pattern from Phase 4 / 5 / 6 still applies, with the
 * default-case expectations inverted to match the `'live'`
 * contract — same shape as the Phase 5 `notifications_live` and
 * `realtime_infrastructure_live` live-by-default flags.
 */
const phase7Flags = [
  'admin_live',
  'admin_review_moderation_live',
  'admin_comment_moderation_live',
  'admin_tag_live',
  'admin_category_live',
  'admin_ranking_live',
  'admin_achievement_live',
  'admin_tournament_live',
  'admin_user_role_live',
  'admin_audit_live',
] as const;

const phase7EnvVars = {
  admin_live: 'NEXT_PUBLIC_ADMIN_LIVE',
  admin_review_moderation_live: 'NEXT_PUBLIC_ADMIN_REVIEW_MODERATION_LIVE',
  admin_comment_moderation_live: 'NEXT_PUBLIC_ADMIN_COMMENT_MODERATION_LIVE',
  admin_tag_live: 'NEXT_PUBLIC_ADMIN_TAG_LIVE',
  admin_category_live: 'NEXT_PUBLIC_ADMIN_CATEGORY_LIVE',
  admin_ranking_live: 'NEXT_PUBLIC_ADMIN_RANKING_LIVE',
  admin_achievement_live: 'NEXT_PUBLIC_ADMIN_ACHIEVEMENT_LIVE',
  admin_tournament_live: 'NEXT_PUBLIC_ADMIN_TOURNAMENT_LIVE',
  admin_user_role_live: 'NEXT_PUBLIC_ADMIN_USER_ROLE_LIVE',
  admin_audit_live: 'NEXT_PUBLIC_ADMIN_AUDIT_LIVE',
} as const;

for (const flag of phase7Flags) {
  describe(`feature-flags — ${flag} (live by default)`, () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it("(1) defaults to 'live' when the env-var is unset", async () => {
      vi.stubEnv(phase7EnvVars[flag], undefined);
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it('(2) returns "live" when the env-var is set to "live"', async () => {
      vi.stubEnv(phase7EnvVars[flag], 'live');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(3) returns the default ('live') when the env-var is an unsupported value", async () => {
      vi.stubEnv(phase7EnvVars[flag], 'unsupported-value');
      const { getFeatureFlagValue } = await importFresh();
      expect(getFeatureFlagValue(flag)).toBe('live');
    });

    it("(4) isFeatureEnabled returns the correct boolean for each value", async () => {
      vi.stubEnv(phase7EnvVars[flag], 'live');
      const enabled = await importFresh();
      expect(enabled.isFeatureEnabled(flag, 'live')).toBe(true);
      expect(enabled.isFeatureEnabled(flag, 'placeholder')).toBe(false);

      vi.stubEnv(phase7EnvVars[flag], 'placeholder');
      const disabled = await importFresh();
      expect(disabled.isFeatureEnabled(flag, 'live')).toBe(false);
      expect(disabled.isFeatureEnabled(flag, 'placeholder')).toBe(true);
    });

    it('isFeatureEnabled(flag) without a value returns true when an env-var override is active', async () => {
      // Setting an *explicit* override (any supported value other than
      // the default) flips the override-active detection to true.
      vi.stubEnv(phase7EnvVars[flag], 'placeholder');
      const overridden = await importFresh();
      expect(overridden.isFeatureEnabled(flag)).toBe(true);

      vi.stubEnv(phase7EnvVars[flag], undefined);
      const atDefault = await importFresh();
      expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

/**
 * Phase 7 admin sub-flags must reference `admin_live` as their
 * prerequisite — this is acceptance criterion #2 of TKT-7.1.B1 and a
 * cross-batch invariant of Epic 7.1. The parent gate stays on its own;
 * this test pins the documented relationship so a future refactor that
 * loses the dependency will fail here.
 */
describe('feature-flags — Phase 7 admin sub-flag prerequisites', () => {
  it('every admin_live_* sub-flag is documented as requiring admin_live', () => {
    expect(featureFlagsImpl.FEATURE_FLAGS).toContain('admin_live');
    for (const sub of [
      'admin_review_moderation_live',
      'admin_comment_moderation_live',
      'admin_tag_live',
      'admin_category_live',
      'admin_ranking_live',
      'admin_achievement_live',
      'admin_tournament_live',
      'admin_user_role_live',
      'admin_audit_live',
    ] as const) {
      expect(featureFlagsImpl.FEATURE_FLAGS).toContain(sub);
    }
  });
});
