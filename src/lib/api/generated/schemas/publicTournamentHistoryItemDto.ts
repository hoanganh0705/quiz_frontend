

export interface PublicTournamentHistoryItemDto {

tournamentId: string;

tournamentName: string;

rank?: number | null;

score: number;

participantCount: number;

completedAt: string;
}
