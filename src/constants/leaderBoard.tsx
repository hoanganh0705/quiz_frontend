export const BADGE_TYPES = {
  DIAMOND: 'Diamond',
  PLATINUM: 'Platinum',
  GOLD: 'Gold',
  SILVER: 'Silver',
  BRONZE: 'Bronze'
} as const

export type BadgeType = (typeof BADGE_TYPES)[keyof typeof BADGE_TYPES]
export interface LeaderboardEntry {
  id: string
  name: string
  avatar: string
  score: number
  time?: string
  badge: BadgeType
  rank?: number
  badgeColor?: string
  borderColor?: string
  rankBgColor?: string
  rankTextColor?: string
  stars?: number
}

export const leaderboardData = {
  today: [
    {
      id: '7',
      name: 'QuizMaster',
      avatar: '/avatarPlaceholder.webp',
      score: 100,
      time: '1m 7s',
      badge: BADGE_TYPES.GOLD,
      rank: 7,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '8',
      name: 'BrainGenius',
      avatar: '/avatarPlaceholder.webp',
      score: 100,
      time: '1m 22s',
      badge: BADGE_TYPES.SILVER,
      rank: 8,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '9',
      name: 'KnowledgeKing',
      avatar: '/avatarPlaceholder.webp',
      score: 80,
      time: '1m 3s',
      badge: BADGE_TYPES.BRONZE,
      rank: 9,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    }
  ],
  week: [
    {
      id: '4',
      name: 'WeeklyChamp',
      avatar: '/avatarPlaceholder.webp',
      score: 950,
      time: 'avg 45s',
      badge: BADGE_TYPES.GOLD,
      rank: 4,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '5',
      name: 'ConsistentPro',
      avatar: '/avatarPlaceholder.webp',
      score: 920,
      time: 'avg 52s',
      badge: BADGE_TYPES.SILVER,
      rank: 5,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '6',
      name: 'SteadyLearner',
      avatar: '/avatarPlaceholder.webp',
      score: 890,
      time: 'avg 48s',
      badge: BADGE_TYPES.BRONZE,
      rank: 6,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    }
  ],
  allTime: [
    {
      id: '1',
      name: 'Alex Johnson',
      avatar: '/avatarPlaceholder.webp',
      score: 9850,
      time: 'avg 42s',
      badge: BADGE_TYPES.DIAMOND,
      rank: 1,
      badgeColor: 'bg-default hover:bg-default-hover',
      borderColor: 'border-yellow-400',
      rankBgColor: 'bg-yellow-400',
      rankTextColor: 'text-slate-900',
      stars: 78
    },
    {
      id: '2',
      name: 'Sarah Williams',
      avatar: '/avatarPlaceholder.webp',
      score: 8720,
      time: undefined,
      badge: BADGE_TYPES.PLATINUM,
      rank: 2,
      badgeColor: 'bg-slate-600',
      borderColor: 'border-slate-400',
      rankBgColor: 'bg-slate-400',
      rankTextColor: 'text-slate-900',
      stars: 65
    },
    {
      id: '3',
      name: 'Michael Brown',
      avatar: '/avatarPlaceholder.webp',
      score: 7640,
      time: undefined,
      badge: BADGE_TYPES.GOLD,
      rank: 3,
      badgeColor: 'bg-amber-600 hover:bg-amber-700',
      borderColor: 'border-amber-600',
      rankBgColor: 'bg-amber-600',
      rankTextColor: 'text-white',
      stars: 59
    },
    {
      id: '10',
      name: 'LegendaryMind',
      avatar: '/avatarPlaceholder.webp',
      score: 9850,
      time: 'avg 42s',
      badge: BADGE_TYPES.DIAMOND,
      rank: 10,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '11',
      name: 'EternalWisdom',
      avatar: '/avatarPlaceholder.webp',
      score: 9720,
      time: 'avg 44s',
      badge: BADGE_TYPES.PLATINUM,
      rank: 11,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    },
    {
      id: '12',
      name: 'TimelessGenius',
      avatar: '/avatarPlaceholder.webp',
      score: 9650,
      time: 'avg 46s',
      badge: BADGE_TYPES.GOLD,
      rank: 12,
      badgeColor: undefined,
      borderColor: undefined,
      rankBgColor: undefined,
      rankTextColor: undefined,
      stars: undefined
    }
  ]
}

export default leaderboardData
