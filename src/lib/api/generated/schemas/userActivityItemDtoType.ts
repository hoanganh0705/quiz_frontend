

export type UserActivityItemDtoType = typeof UserActivityItemDtoType[keyof typeof UserActivityItemDtoType];

export const UserActivityItemDtoType = {
badge_earned: 'badge_earned',
badge_revoked: 'badge_revoked',
rank_milestone: 'rank_milestone',
peak_rank_achieved: 'peak_rank_achieved',
tournament_joined: 'tournament_joined',
tournament_completed: 'tournament_completed',
tournament_won: 'tournament_won',
comment_created: 'comment_created',
quiz_completed: 'quiz_completed',
quiz_milestone: 'quiz_milestone',
instance_created: 'instance_created',
instance_joined: 'instance_joined',
instance_completed: 'instance_completed',
} as const;
