

import type {
CreateTournamentDto,
TournamentControllerListTournaments200,
UpdateTournamentDto,
} from '@/lib/api/generated/schemas';

export type { TournamentDto } from '@/features/admin/services/tournament-admin.service';

export type TournamentCreateDto = CreateTournamentDto;

export type TournamentUpdateDto = UpdateTournamentDto;

export type TournamentListDto = TournamentControllerListTournaments200;

export interface TournamentCascadeDto {

participants: number | null;

rounds: number | null;

leaderboards: number | null;

hasMoreParticipants?: boolean;
}

export const TOURNAMENT_ADMIN_PAGE_SIZE = 20 as const;

export interface TournamentAdminFilters {

status?:
| 'upcoming'
    | 'registration'
    | 'ongoing'
    | 'finished'
    | 'cancelled';

search: string;

cursor?: string;

limit?: number;
}

export const DEFAULT_TOURNAMENT_ADMIN_FILTERS: TournamentAdminFilters = {
status: undefined,
search: '',
cursor: undefined,
limit: TOURNAMENT_ADMIN_PAGE_SIZE,
} as const;

