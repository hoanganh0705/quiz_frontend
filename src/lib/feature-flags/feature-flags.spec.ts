

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as featureFlagsImpl from "./feature-flags";
import * as featureFlagsBarrel from "./index";

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

vi.stubEnv(phase5EnvVars[flag], 'placeholder');
const overridden = await importFresh();
expect(overridden.isFeatureEnabled(flag)).toBe(true);

vi.stubEnv(phase5EnvVars[flag], undefined);
const atDefault = await importFresh();
expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

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

vi.stubEnv(phase7EnvVars[flag], 'placeholder');
const overridden = await importFresh();
expect(overridden.isFeatureEnabled(flag)).toBe(true);

vi.stubEnv(phase7EnvVars[flag], undefined);
const atDefault = await importFresh();
expect(atDefault.isFeatureEnabled(flag)).toBe(false);
    });
  });
}

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
