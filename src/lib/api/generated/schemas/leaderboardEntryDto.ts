

export interface LeaderboardEntryDto {

rank: number;

denseRank: number;

userId: string;

displayName: string;

avatarUrl?: string | null;

xp: number;

isTied: boolean;

isCurrentUser?: boolean | null;
}
