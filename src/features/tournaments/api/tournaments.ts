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
//
// The response interceptor in `custom-instance.ts` does NOT unwrap
// the `{ data, meta }` envelope (see the long-form comment on the
// interceptor for the rationale). The wire response is therefore
// the wrapped envelope; each helper below reads `.data` at the call
// boundary to extract the inner payload.
export async function getTournaments(params?: GetTournamentsParams) {
  const response = await customInstance.request<{ data: GetTournamentsResponse }>({
    url: '/api/v1/tournaments',
    method: 'GET',
    params,
  })
  return response.data.data
}

export async function getFeaturedTournament() {
  const response = await customInstance.request<{ data: Tournament }>({
    url: '/api/v1/tournaments/featured',
    method: 'GET',
  })
  return response.data.data
}

export async function getTournamentDetails(tournamentId: string) {
  const response = await customInstance.request<{ data: GetTournamentDetailsResponse }>({
    url: `/api/v1/tournaments/${tournamentId}`,
    method: 'GET',
  })
  return response.data.data
}

export async function registerForTournament(tournamentId: string) {
  const response = await customInstance.request<{ data: TournamentRegistrationResponse }>({
    url: `/api/v1/tournaments/${tournamentId}/register`,
    method: 'POST',
  })
  return response.data.data
}

export async function cancelTournamentRegistration(tournamentId: string) {
  const response = await customInstance.request<{ data: TournamentRegistrationResponse }>({
    url: `/api/v1/tournaments/${tournamentId}/register`,
    method: 'DELETE',
  })
  return response.data.data
}

export async function getTournamentCategories() {
  const response = await customInstance.request<{ data: string[] }>({
    url: '/api/v1/tournaments/categories',
    method: 'GET',
  })
  return response.data.data
}