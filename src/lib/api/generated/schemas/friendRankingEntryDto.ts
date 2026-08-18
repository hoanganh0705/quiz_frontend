

import type { FriendRankingEntryDtoDisplayName } from './friendRankingEntryDtoDisplayName';
import type { FriendRankingEntryDtoAvatarUrl } from './friendRankingEntryDtoAvatarUrl';

export interface FriendRankingEntryDto {

rank: number;

userId: string;

username: string;

displayName?: FriendRankingEntryDtoDisplayName;

avatarUrl?: FriendRankingEntryDtoAvatarUrl;

xp: number;

friendSince: string;
}
