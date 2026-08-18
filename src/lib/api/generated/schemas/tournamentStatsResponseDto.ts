

export interface TournamentStatsResponseDto {

tournamentId: string;

participants: number;

completedParticipants: number;

averageScore: number;

highestScore?: number | null;

lowestScore?: number | null;

completionRate: number;

averageRank?: number | null;

startedAt: string;

endedAt: string;
}
