

import type {
TournamentDetailResponseDto,
TournamentRoundResponseDto,
TournamentLeaderboardEntryDto,
CreateTournamentDto,
RegisterTournamentResponseDto,
TournamentControllerListTournamentsParams,
TournamentControllerGetTournamentParticipantsParams,
TournamentControllerGetLeaderboardParams,
} from '@/lib/api/generated/schemas';

import type { TournamentResponseDto } from '@/lib/api/generated/schemas/tournamentResponseDto';

import type {
TournamentControllerCreateTournamentResult,
TournamentControllerListTournamentsResult,
TournamentControllerGetTournamentByIdResult,
TournamentControllerRegisterForTournamentResult,
TournamentControllerUnregisterFromTournamentResult,
TournamentControllerGetLeaderboardResult,
TournamentControllerStartRoundAttemptResult,
} from '@/lib/api/generated/tournaments/tournaments';

export type {
TournamentDetailResponseDto,
TournamentRoundResponseDto,
TournamentLeaderboardEntryDto,
CreateTournamentDto,
RegisterTournamentResponseDto,
TournamentControllerListTournamentsParams,
TournamentControllerGetTournamentParticipantsParams,
TournamentControllerGetLeaderboardParams,
};

export type { TournamentResponseDto } from '@/lib/api/generated/schemas/tournamentResponseDto';

export type {
TournamentControllerCreateTournamentResult,
TournamentControllerListTournamentsResult,
TournamentControllerGetTournamentByIdResult,
TournamentControllerRegisterForTournamentResult,
TournamentControllerUnregisterFromTournamentResult,
TournamentControllerGetLeaderboardResult,
TournamentControllerStartRoundAttemptResult,
};

export type TournamentDifficulty = 'easy' | 'medium' | 'hard';
export type Tournament = TournamentResponseDto;
export type GetTournamentsResponse = TournamentResponseDto;
export type GetTournamentsParams = TournamentControllerListTournamentsParams;
export type GetTournamentDetailsResponse = TournamentDetailResponseDto;
export type TournamentRegistrationResponse = RegisterTournamentResponseDto;
export type TournamentRegistrationRequest = CreateTournamentDto;

export interface TournamentCategory {
id: string;
name: string;
}

export {
DEFAULT_TOURNAMENT_LIST_FILTERS,
TOURNAMENT_CACHE_KEYS,
serializeTournamentFilters,
} from './tournament.types';

export type {
TournamentListFilters,
TournamentParticipantsFilters,
TournamentLeaderboardFilters,
TournamentListPage,
TournamentParticipantsPage,
TournamentLeaderboardPage,
TournamentSummary,
TournamentDetail,
TournamentParticipant,
TournamentLeaderboardEntry,
TournamentStatus,
} from './tournament.types';

export {
TOURNAMENT_REGISTRATION_CACHE_KEYS,
} from './registration.types';

export type {
RegistrationStatus,
RegistrationErrorCode,
ParticipationState,
RegistrationResult,
WithdrawalResult,
RegistrationMutationState,
RegistrationInvalidationKeys,
} from './registration.types';
