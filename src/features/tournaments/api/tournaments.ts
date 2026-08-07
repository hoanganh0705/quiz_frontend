import { customInstance } from '@/lib/api'

import type {
  GetTournamentsParams,
  GetTournamentsResponse,
  GetTournamentDetailsResponse,
  TournamentRegistrationResponse,
  Tournament
} from '../types'

// Phase 1: migrated from `@/shared/lib/api/client` to `@/lib/api`.
// See docs/frontend-cleanup-audit.md Phase 1.
export async function getTournaments(params?: GetTournamentsParams) {
  const response = await customInstance.request<{ data: GetTournamentsResponse }>({
    url: '/tournaments',
    method: 'GET',
    params,
  })
  return response.data.data
}

export async function getFeaturedTournament() {
  const response = await customInstance.request<{ data: Tournament }>({
    url: '/tournaments/featured',
    method: 'GET',
  })
  return response.data.data
}

export async function getTournamentDetails(tournamentId: string) {
  const response = await customInstance.request<{ data: GetTournamentDetailsResponse }>({
    url: `/tournaments/${tournamentId}`,
    method: 'GET',
  })
  return response.data.data
}

export async function registerForTournament(tournamentId: string) {
  const response = await customInstance.request<{ data: TournamentRegistrationResponse }>({
    url: `/tournaments/${tournamentId}/register`,
    method: 'POST',
  })
  return response.data.data
}

export async function cancelTournamentRegistration(tournamentId: string) {
  const response = await customInstance.request<{ data: TournamentRegistrationResponse }>({
    url: `/tournaments/${tournamentId}/register`,
    method: 'DELETE',
  })
  return response.data.data
}

export async function getTournamentCategories() {
  const response = await customInstance.request<{ data: string[] }>({
    url: '/tournaments/categories',
    method: 'GET',
  })
  return response.data.data
}