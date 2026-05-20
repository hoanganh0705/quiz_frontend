import { apiClient } from '@/shared/lib/api/client'

import type {
  GetTournamentsParams,
  GetTournamentsResponse,
  GetTournamentDetailsResponse,
  TournamentRegistrationResponse,
  Tournament
} from '../types'

// Get all tournaments
export async function getTournaments(params?: GetTournamentsParams) {
  const response = await apiClient.get<GetTournamentsResponse>('/tournaments', {
    params
  })
  return response.data
}

// Get featured tournament
export async function getFeaturedTournament() {
  const response = await apiClient.get<Tournament>('/tournaments/featured')
  return response.data
}

// Get tournament details
export async function getTournamentDetails(tournamentId: string) {
  const response = await apiClient.get<GetTournamentDetailsResponse>(
    `/tournaments/${tournamentId}`
  )
  return response.data
}

// Register for tournament
export async function registerForTournament(tournamentId: string) {
  const response = await apiClient.post<TournamentRegistrationResponse>(
    `/tournaments/${tournamentId}/register`
  )
  return response.data
}

// Cancel tournament registration
export async function cancelTournamentRegistration(tournamentId: string) {
  const response = await apiClient.delete<TournamentRegistrationResponse>(
    `/tournaments/${tournamentId}/register`
  )
  return response.data
}

// Get tournament categories
export async function getTournamentCategories() {
  const response = await apiClient.get<string[]>('/tournaments/categories')
  return response.data
}
