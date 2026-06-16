// Tournaments types — aligned with backend DTOs

// Re-export from generated SDK
export type {
  TournamentResponseDto,
  TournamentDetailResponseDto,
  TournamentListResponseDto,
  TournamentPaginationResponseDto,
  TournamentRoundResponseDto,
  TournamentLeaderboardResponseDto,
  TournamentLeaderboardEntryDto,
  CreateTournamentDto,
  RegisterTournamentResponseDto,
  UnregisterTournamentResponseDto,
  StartTournamentAttemptResponseDto,
  TournamentControllerListTournamentsParams,
} from '@/lib/api/generated/schemas';

export type {
  TournamentControllerCreateTournamentResult,
  TournamentControllerListTournamentsResult,
  TournamentControllerGetTournamentByIdResult,
  TournamentControllerRegisterForTournamentResult,
  TournamentControllerUnregisterFromTournamentResult,
  TournamentControllerGetLeaderboardResult,
  TournamentControllerStartRoundAttemptResult,
} from '@/lib/api/generated/tournaments/tournaments';

// Backward-compatible type aliases
export type TournamentStatus = 'upcoming' | 'registration' | 'active' | 'completed' | 'cancelled';
export type TournamentDifficulty = 'easy' | 'medium' | 'hard';
export type Tournament = TournamentResponseDto;
export type GetTournamentsResponse = TournamentListResponseDto;
export type TournamentLeaderboardEntry = TournamentLeaderboardResponseDto;
