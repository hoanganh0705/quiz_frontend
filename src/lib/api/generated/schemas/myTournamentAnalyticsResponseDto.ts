

export interface MyTournamentAnalyticsResponseDto {

tournamentsPlayed: number;

wins: number;

top3Finishes: number;

top10Finishes: number;

averageRank?: number | null;

bestRank?: number | null;

averageScore: number;

totalTournamentScore: number;

completionRate: number;

lastTournamentAt?: string | null;
}
