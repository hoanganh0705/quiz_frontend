export interface FriendStats {
  quizzesPlayed: number
  averageScore: number
  winRate: number
  streak: number
}

export interface FriendProfile {
  id: number
  name: string
  username: string
  avatar: string
  onlineStatus: 'online' | 'away' | 'offline'
  stats: FriendStats
}

export interface QuizInvitation {
  id: string
  friendId: number
  quizId: string
  sentAt: string
}

export interface SocialState {
  friends: number[]
  incomingRequests: number[]
  outgoingRequests: number[]
  invitations: QuizInvitation[]
}

export const currentUserStats: FriendStats = {
  quizzesPlayed: 142,
  averageScore: 84,
  winRate: 71,
  streak: 12
}

export const friendProfiles: FriendProfile[] = [
  {
    id: 101,
    name: 'Maya Nguyen',
    username: '@mayaqz',
    avatar: '/placeholder.svg',
    onlineStatus: 'online',
    stats: {
      quizzesPlayed: 188,
      averageScore: 88,
      winRate: 76,
      streak: 19
    }
  },
  {
    id: 102,
    name: 'Alex Carter',
    username: '@alexplays',
    avatar: '/placeholder.svg',
    onlineStatus: 'away',
    stats: {
      quizzesPlayed: 120,
      averageScore: 79,
      winRate: 68,
      streak: 7
    }
  },
  {
    id: 103,
    name: 'Sofia Tran',
    username: '@sofiaq',
    avatar: '/placeholder.svg',
    onlineStatus: 'online',
    stats: {
      quizzesPlayed: 95,
      averageScore: 82,
      winRate: 70,
      streak: 9
    }
  },
  {
    id: 104,
    name: 'Daniel Kim',
    username: '@dankim',
    avatar: '/placeholder.svg',
    onlineStatus: 'offline',
    stats: {
      quizzesPlayed: 73,
      averageScore: 77,
      winRate: 62,
      streak: 4
    }
  },
  {
    id: 105,
    name: 'Lina Pham',
    username: '@linap',
    avatar: '/placeholder.svg',
    onlineStatus: 'online',
    stats: {
      quizzesPlayed: 205,
      averageScore: 91,
      winRate: 82,
      streak: 24
    }
  },
  {
    id: 106,
    name: 'Noah Lee',
    username: '@noahlee',
    avatar: '/placeholder.svg',
    onlineStatus: 'away',
    stats: {
      quizzesPlayed: 132,
      averageScore: 81,
      winRate: 66,
      streak: 6
    }
  }
]

export const defaultSocialState: SocialState = {
  friends: [101, 102],
  incomingRequests: [103],
  outgoingRequests: [104],
  invitations: []
}
