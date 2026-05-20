// Tournaments domain types

export type TournamentStatus =
  | 'upcoming'
  | 'registration'
  | 'ongoing'
  | 'completed'

export type TournamentDifficulty = 'Easy' | 'Medium' | 'Hard'

export interface Tournament {
  id: string | number
  title: string
  description: string
  image?: string
  category: string
  difficulty: TournamentDifficulty
  status: string
  statusColor: string
  dateRange: string
  startDate: string
  endDate: string
  participants: number
  prize: string
  registrationOpen: boolean
  closingInfo?: string
  rounds?: number
  questionsPerRound?: number
  categories?: string[]
}

export interface GetTournamentsResponse {
  tournaments: Tournament[]
  featuredTournament?: Tournament
  total: number
}

export interface GetTournamentsParams {
  status?: TournamentStatus
  category?: string
  page?: number
  limit?: number
}

export interface TournamentRegistrationRequest {
  tournamentId: string
}

export interface TournamentRegistrationResponse {
  success: boolean
  message: string
}

export interface GetTournamentDetailsResponse {
  tournament: Tournament
  participants: number
  userRegistered: boolean
  leaderboard: TournamentLeaderboardEntry[]
}

export interface TournamentLeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  score: number
  completedAt: string
}

export interface Category {
  id: string
  name: string
}

export interface TournamentCategory {
  id: string
  name: string
  icon: string
  count: number
}
