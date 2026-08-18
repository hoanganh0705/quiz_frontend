export const BADGE_TYPES = {
DIAMOND: 'Diamond',
PLATINUM: 'Platinum',
GOLD: 'Gold',
SILVER: 'Silver',
BRONZE: 'Bronze',
} as const

export type BadgeType = (typeof BADGE_TYPES)[keyof typeof BADGE_TYPES]
