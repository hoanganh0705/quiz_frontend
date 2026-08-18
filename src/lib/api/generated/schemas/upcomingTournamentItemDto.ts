

export interface UpcomingTournamentItemDto {

tournamentId: string;

name: string;

description?: string | null;

startAt: string;

endAt: string;

participantCount: number;
}
