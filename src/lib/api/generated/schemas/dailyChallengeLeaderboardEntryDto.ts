

import type { DailyChallengeLeaderboardEntryDtoDisplayName } from './dailyChallengeLeaderboardEntryDtoDisplayName';
import type { DailyChallengeLeaderboardEntryDtoAvatarUrl } from './dailyChallengeLeaderboardEntryDtoAvatarUrl';

export interface DailyChallengeLeaderboardEntryDto {

rank: number;

userId: string;

username: string;

displayName: DailyChallengeLeaderboardEntryDtoDisplayName;

avatarUrl: DailyChallengeLeaderboardEntryDtoAvatarUrl;

scorePercent: number;
}
