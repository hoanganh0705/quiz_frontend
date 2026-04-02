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
