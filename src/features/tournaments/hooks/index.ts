// Tournaments hooks

// Phase 3 / legacy
export { useTournamentPage } from './use-tournament-page'

// Story 5.2 — Tournament discovery and read-only detail surfaces
export { useTournaments } from './useTournaments'
export type { UseTournamentsResult, TournamentListPage } from './useTournaments'

export { useTournament } from './useTournament'
export type { UseTournamentResult } from './useTournament'

export { useTournamentParticipants } from './useTournamentParticipants'
export type { UseTournamentParticipantsResult } from './useTournamentParticipants'

export { useTournamentLeaderboard } from './useTournamentLeaderboard'
export type { UseTournamentLeaderboardResult } from './useTournamentLeaderboard'

export { useTournamentFilters } from './useTournamentFilters'
export type { UseTournamentFiltersResult } from './useTournamentFilters'

export { useTournamentFeatureFlag } from './useTournamentFeatureFlag'
export type { UseTournamentFeatureFlagResult } from './useTournamentFeatureFlag'

// Story 5.3 — Tournament registration and participant-state mutations
export { useTournamentParticipation } from './useTournamentParticipation'
export type { UseTournamentParticipationResult } from './useTournamentParticipation'

export { useRegisterTournament } from './useRegisterTournament'
export type { UseRegisterTournamentResult } from './useRegisterTournament'

export { useWithdrawTournament } from './useWithdrawTournament'
export type { UseWithdrawTournamentResult } from './useWithdrawTournament'

export { useTournamentRegistration } from './useTournamentRegistration'
export type { UseTournamentRegistrationResult } from './useTournamentRegistration'
