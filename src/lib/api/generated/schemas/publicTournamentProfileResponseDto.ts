

export interface PublicTournamentProfileResponseDto {

userId: string;

tournamentsPlayed: number;

tournamentsWon: number;

bestRank?: number | null;

averageRank?: number | null;

top10Finishes: number;

totalTournamentScore: number;

lastTournamentAt?: string | null;
}
