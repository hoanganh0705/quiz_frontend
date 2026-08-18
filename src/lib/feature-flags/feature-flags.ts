

export type FeatureFlag =
| 'dailyChallengePage'
  | 'authoring_live'
  | 'personal_area_live'
  | 'attempts_live'
  | 'realtime_infrastructure_live'
  | 'tournaments_live'
  | 'notifications_live'
  | 'multiplayer_instances_live'
  | 'multiplayer_play_live'
  | 'rankings_live'
  | 'achievements_live'
  | 'search_live'
  | 'social_live'
  | 'social_relationship_live'
  | 'social_feed_live'
  | 'social_discovery_live'
  | 'social_realtime_notifications_live'
  | 'social_mutuals_live'
  | 'social_activity_live'
  | 'social_user_search_live'
  | 'social_follow_mutation_live'
  | 'social_block_mutation_live'
  | 'social_friend_request_mutation_live'
  | 'admin_live'
  | 'admin_review_moderation_live'
  | 'admin_comment_moderation_live'
  | 'admin_tag_live'
  | 'admin_category_live'
  | 'admin_ranking_live'
  | 'admin_achievement_live'
  | 'admin_tournament_live'
  | 'admin_user_role_live'
  | 'admin_audit_live'
  | 'coin_economy_live'
  | 'coin_spend_live'

export type FeatureFlagValueMap = {

dailyChallengePage: 'v1' | 'placeholder'

authoring_live: 'live' | 'placeholder'

personal_area_live: 'live' | 'placeholder'

attempts_live: 'live' | 'placeholder'

realtime_infrastructure_live: 'live' | 'placeholder'

tournaments_live: 'live' | 'placeholder'

notifications_live: 'live' | 'placeholder'

multiplayer_instances_live: 'live' | 'placeholder'

multiplayer_play_live: 'live' | 'placeholder'

rankings_live: 'live' | 'placeholder'

achievements_live: 'live' | 'placeholder'

search_live: 'live' | 'placeholder'

social_live: 'live' | 'placeholder'

social_relationship_live: 'live' | 'placeholder'

social_feed_live: 'live' | 'placeholder'

social_discovery_live: 'live' | 'placeholder'

social_realtime_notifications_live: 'live' | 'placeholder'

social_mutuals_live: 'live' | 'placeholder'

social_activity_live: 'live' | 'placeholder'

social_user_search_live: 'live' | 'placeholder'

social_follow_mutation_live: 'live' | 'placeholder'

social_block_mutation_live: 'live' | 'placeholder'

social_friend_request_mutation_live: 'live' | 'placeholder'

admin_live: 'live' | 'placeholder'

admin_review_moderation_live: 'live' | 'placeholder'

admin_comment_moderation_live: 'live' | 'placeholder'

admin_tag_live: 'live' | 'placeholder'

admin_category_live: 'live' | 'placeholder'

admin_ranking_live: 'live' | 'placeholder'

admin_achievement_live: 'live' | 'placeholder'

admin_tournament_live: 'live' | 'placeholder'

admin_user_role_live: 'live' | 'placeholder'

admin_audit_live: 'live' | 'placeholder'

coin_economy_live: 'live' | 'placeholder'

coin_spend_live: 'live' | 'placeholder'
}

export const FEATURE_FLAGS: readonly FeatureFlag[] = [
'dailyChallengePage',
'authoring_live',
'personal_area_live',
'attempts_live',
'realtime_infrastructure_live',
'tournaments_live',
'notifications_live',
'multiplayer_instances_live',
'multiplayer_play_live',
'rankings_live',
'achievements_live',
'search_live',
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
'coin_economy_live',
'coin_spend_live',
]

const FLAG_DEFAULTS: FeatureFlagValueMap = {
dailyChallengePage: 'v1',
authoring_live: 'placeholder',
personal_area_live: 'placeholder',
attempts_live: 'placeholder',
realtime_infrastructure_live: 'live',
tournaments_live: 'live',
notifications_live: 'live',
multiplayer_instances_live: 'live',
multiplayer_play_live: 'live',
rankings_live: 'live',
achievements_live: 'live',
search_live: 'live',
social_live: 'live',
social_relationship_live: 'live',
social_feed_live: 'live',
social_discovery_live: 'live',
social_realtime_notifications_live: 'live',
social_mutuals_live: 'live',
social_activity_live: 'live',
social_user_search_live: 'live',
social_follow_mutation_live: 'live',
social_block_mutation_live: 'live',
social_friend_request_mutation_live: 'live',
admin_live: 'live',
admin_review_moderation_live: 'live',
admin_comment_moderation_live: 'live',
admin_tag_live: 'live',
admin_category_live: 'live',
admin_ranking_live: 'live',
admin_achievement_live: 'live',
admin_tournament_live: 'live',
admin_user_role_live: 'live',
admin_audit_live: 'live',
coin_economy_live: 'live',
coin_spend_live: 'live',
}

const FLAG_ENV_OVERRIDES: Record<FeatureFlag, string | undefined> = {
dailyChallengePage: process.env.NEXT_PUBLIC_DAILY_CHALLENGE_PAGE,
authoring_live: process.env.NEXT_PUBLIC_AUTHORING_LIVE,
personal_area_live: process.env.NEXT_PUBLIC_PERSONAL_AREA_LIVE,
attempts_live: process.env.NEXT_PUBLIC_ATTEMPTS_LIVE,
realtime_infrastructure_live: process.env.NEXT_PUBLIC_REALTIME_INFRASTRUCTURE_LIVE,
tournaments_live: process.env.NEXT_PUBLIC_TOURNAMENTS_LIVE,
notifications_live: process.env.NEXT_PUBLIC_NOTIFICATIONS_LIVE,
multiplayer_instances_live: process.env.NEXT_PUBLIC_MULTIPLAYER_INSTANCES_LIVE,
multiplayer_play_live: process.env.NEXT_PUBLIC_MULTIPLAYER_PLAY_LIVE,
rankings_live: process.env.NEXT_PUBLIC_RANKINGS_LIVE,
achievements_live: process.env.NEXT_PUBLIC_ACHIEVEMENTS_LIVE,
search_live: process.env.NEXT_PUBLIC_SEARCH_LIVE,
social_live: process.env.NEXT_PUBLIC_SOCIAL_LIVE,
social_relationship_live: process.env.NEXT_PUBLIC_SOCIAL_RELATIONSHIP_LIVE,
social_feed_live: process.env.NEXT_PUBLIC_SOCIAL_FEED_LIVE,
social_discovery_live: process.env.NEXT_PUBLIC_SOCIAL_DISCOVERY_LIVE,
social_realtime_notifications_live: process.env.NEXT_PUBLIC_SOCIAL_REALTIME_NOTIFICATIONS_LIVE,
social_mutuals_live: process.env.NEXT_PUBLIC_SOCIAL_MUTUALS_LIVE,
social_activity_live: process.env.NEXT_PUBLIC_SOCIAL_ACTIVITY_LIVE,
social_user_search_live: process.env.NEXT_PUBLIC_SOCIAL_USER_SEARCH_LIVE,
social_follow_mutation_live: process.env.NEXT_PUBLIC_SOCIAL_FOLLOW_MUTATION_LIVE,
social_block_mutation_live: process.env.NEXT_PUBLIC_SOCIAL_BLOCK_MUTATION_LIVE,
social_friend_request_mutation_live: process.env.NEXT_PUBLIC_SOCIAL_FRIEND_REQUEST_MUTATION_LIVE,
admin_live: process.env.NEXT_PUBLIC_ADMIN_LIVE,
admin_review_moderation_live: process.env.NEXT_PUBLIC_ADMIN_REVIEW_MODERATION_LIVE,
admin_comment_moderation_live: process.env.NEXT_PUBLIC_ADMIN_COMMENT_MODERATION_LIVE,
admin_tag_live: process.env.NEXT_PUBLIC_ADMIN_TAG_LIVE,
admin_category_live: process.env.NEXT_PUBLIC_ADMIN_CATEGORY_LIVE,
admin_ranking_live: process.env.NEXT_PUBLIC_ADMIN_RANKING_LIVE,
admin_achievement_live: process.env.NEXT_PUBLIC_ADMIN_ACHIEVEMENT_LIVE,
admin_tournament_live: process.env.NEXT_PUBLIC_ADMIN_TOURNAMENT_LIVE,
admin_user_role_live: process.env.NEXT_PUBLIC_ADMIN_USER_ROLE_LIVE,
admin_audit_live: process.env.NEXT_PUBLIC_ADMIN_AUDIT_LIVE,
coin_economy_live: process.env.NEXT_PUBLIC_COIN_ECONOMY_LIVE,
coin_spend_live: process.env.NEXT_PUBLIC_COIN_SPEND_LIVE,
}

function isFlagValue<K extends FeatureFlag>(
flag: K,
candidate: string,
): candidate is FeatureFlagValueMap[K] {
if (flag === 'dailyChallengePage') {
return candidate === 'v1' || candidate === 'placeholder'
  }
if (
flag === 'authoring_live' ||
flag === 'personal_area_live' ||
flag === 'attempts_live' ||
flag === 'realtime_infrastructure_live' ||
flag === 'tournaments_live' ||
flag === 'notifications_live' ||
flag === 'multiplayer_instances_live' ||
flag === 'multiplayer_play_live' ||
flag === 'rankings_live' ||
flag === 'achievements_live' ||
flag === 'search_live' ||
flag === 'social_live' ||
flag === 'social_relationship_live' ||
flag === 'social_feed_live' ||
flag === 'social_discovery_live' ||
flag === 'social_realtime_notifications_live' ||
flag === 'social_mutuals_live' ||
flag === 'social_activity_live' ||
flag === 'social_user_search_live' ||
flag === 'social_follow_mutation_live' ||
flag === 'social_block_mutation_live' ||
flag === 'social_friend_request_mutation_live' ||
flag === 'admin_live' ||
flag === 'admin_review_moderation_live' ||
flag === 'admin_comment_moderation_live' ||
flag === 'admin_tag_live' ||
flag === 'admin_category_live' ||
flag === 'admin_ranking_live' ||
flag === 'admin_achievement_live' ||
flag === 'admin_tournament_live' ||
flag === 'admin_user_role_live' ||
flag === 'admin_audit_live' ||
flag === 'coin_economy_live' ||
flag === 'coin_spend_live'
  ) {
return candidate === 'live' || candidate === 'placeholder'
  }
return false
}

function resolveFlagValue<K extends FeatureFlag>(
flag: K,
override: string | undefined,
): FeatureFlagValueMap[K] {
const allowed = FLAG_DEFAULTS[flag]
if (typeof override === 'string' && isFlagValue(flag, override)) {
return override
  }
return allowed
}

export function getFeatureFlagValue<K extends FeatureFlag>(
flag: K,
): FeatureFlagValueMap[K] {
return resolveFlagValue(flag, FLAG_ENV_OVERRIDES[flag])
}

export function isFeatureEnabled<K extends FeatureFlag>(
flag: K,
value?: FeatureFlagValueMap[K],
): boolean {
const current = getFeatureFlagValue(flag)
if (value === undefined) {
return current !== FLAG_DEFAULTS[flag]
  }
return current === value
}
