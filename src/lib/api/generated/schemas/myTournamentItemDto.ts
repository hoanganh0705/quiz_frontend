

import type { MyTournamentItemDtoStatus } from './myTournamentItemDtoStatus';

export interface MyTournamentItemDto {

tournamentId: string;

name: string;

status: MyTournamentItemDtoStatus;

registeredAt: string;

startAt: string;

endAt: string;
}
