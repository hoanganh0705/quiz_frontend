

import type { FriendDtoDisplayName } from './friendDtoDisplayName';
import type { FriendDtoAvatarUrl } from './friendDtoAvatarUrl';

export interface FriendDto {

friendshipId: string;

userId: string;

username: string;

displayName?: FriendDtoDisplayName;

avatarUrl?: FriendDtoAvatarUrl;

friendSince: string;
}
