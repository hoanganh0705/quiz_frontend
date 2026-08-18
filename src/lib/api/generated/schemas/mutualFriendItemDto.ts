

import type { MutualFriendItemDtoDisplayName } from './mutualFriendItemDtoDisplayName';
import type { MutualFriendItemDtoAvatarUrl } from './mutualFriendItemDtoAvatarUrl';

export interface MutualFriendItemDto {

userId: string;

username: string;

displayName?: MutualFriendItemDtoDisplayName;

avatarUrl?: MutualFriendItemDtoAvatarUrl;
}
