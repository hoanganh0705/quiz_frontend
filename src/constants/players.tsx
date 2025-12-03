export interface Player {
  id: string
  rank: number
  avatar?: string
  avatarUrl?: string
  name: string
  country: string
  flag?: string
  streak?: number
  score?: number
  level?: number
  levelString?: string
  quizzes?: number
  wins?: number
  badge?: 'Diamond' | 'Platinum' | 'Gold'
  earned?: number
  followers?: string
  following?: string
  bgImageUrl?: string
}

export const players: Player[] = [
  {
    id: '1',
    rank: 1,
    avatar: '/placeholder.svg',
    avatarUrl: '/avatarPlaceholder.webp',
    name: 'Alex Johnson',
    country: 'United States',
    flag: '🇺🇸',
    streak: 7,
    score: 9850,
    level: 78,
    levelString: 'Grandmaster',
    quizzes: 42,
    wins: 42,
    badge: 'Diamond',
    earned: 1250.75,
    followers: '1.2k',
    following: '356',
    bgImageUrl: '/placeholder.webp'
  },
  {
    id: '2',
    rank: 2,
    avatar: '/placeholder.svg',
    avatarUrl: '/avatarPlaceholder.webp',
    name: 'Sarah Williams',
    country: 'Canada',
    flag: '🇨🇦',
    streak: 8,
    score: 8720,
    level: 65,
    levelString: 'Master',
    quizzes: 38,
    wins: 38,
    badge: 'Platinum',
    earned: 980.5,
    followers: '987',
    following: '412',
    bgImageUrl: '/placeholder.webp'
  },
  {
    id: '3',
    rank: 3,
    avatar: '/placeholder.svg',
    name: 'Michael Brown',
    country: 'United Kingdom',
    flag: undefined,
    streak: 6,
    score: 7640,
    level: 59,
    levelString: undefined,
    quizzes: 35,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '4',
    rank: 4,
    avatar: '/placeholder.svg',
    name: 'Emily Davis',
    country: 'Australia',
    flag: undefined,
    streak: 4,
    score: 6980,
    level: 52,
    levelString: undefined,
    quizzes: 31,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '5',
    rank: 5,
    avatar: '/placeholder.svg',
    name: 'David Wilson',
    country: 'Germany',
    flag: undefined,
    streak: 10,
    score: 6500,
    level: 48,
    levelString: undefined,
    quizzes: 29,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '6',
    rank: 6,
    avatar: '/placeholder.svg',
    name: 'Olivia Martinez',
    country: 'France',
    flag: undefined,
    streak: 7,
    score: 6100,
    level: 45,
    levelString: undefined,
    quizzes: 27,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '7',
    rank: 7,
    avatar: '/placeholder.svg',
    name: 'James Taylor',
    country: 'Japan',
    flag: undefined,
    streak: 12,
    score: 5800,
    level: 42,
    levelString: undefined,
    quizzes: 25,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '8',
    rank: 8,
    avatar: '/placeholder.svg',
    name: 'Sophia Anderson',
    country: 'Brazil',
    flag: undefined,
    streak: 5,
    score: 5500,
    level: 39,
    levelString: undefined,
    quizzes: 23,
    wins: undefined,
    badge: 'Gold',
    earned: undefined,
    followers: undefined,
    following: undefined,
    bgImageUrl: undefined
  },
  {
    id: '11',
    rank: 9,
    avatarUrl: '/avatarPlaceholder.webp',
    name: 'Olivia Anderson',
    country: 'Italy',
    flag: '🇮🇹',
    streak: undefined,
    score: undefined,
    level: undefined,
    levelString: 'Advanced',
    quizzes: 23,
    wins: 23,
    badge: 'Gold',
    earned: 580.3,
    followers: '378',
    following: '267',
    bgImageUrl: '/placeholder.webp'
  },
  {
    id: '12',
    rank: 10,
    avatarUrl: '/avatarPlaceholder.webp',
    name: 'David Lee',
    country: 'Germany',
    flag: '🇩🇪',
    streak: undefined,
    score: undefined,
    level: undefined,
    levelString: 'Advanced',
    quizzes: 35,
    wins: 35,
    badge: 'Gold',
    earned: 750.2,
    followers: '650',
    following: '200',
    bgImageUrl: '/placeholder.webp'
  },
  {
    id: '13',
    rank: 11,
    avatarUrl: '/avatarPlaceholder.webp',
    name: 'Emily Chen',
    country: 'Australia',
    flag: '🇦🇺',
    streak: undefined,
    score: undefined,
    level: undefined,
    levelString: 'Master',
    quizzes: 30,
    wins: 30,
    badge: 'Platinum',
    earned: 620.0,
    followers: '500',
    following: '180',
    bgImageUrl: '/placeholder.webp'
  }
]
