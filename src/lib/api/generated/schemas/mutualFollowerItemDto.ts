

import type { MutualFollowerItemDtoDisplayName } from './mutualFollowerItemDtoDisplayName';
import type { MutualFollowerItemDtoAvatarUrl } from './mutualFollowerItemDtoAvatarUrl';

export interface MutualFollowerItemDto {

userId: string;

username: string;

displayName?: MutualFollowerItemDtoDisplayName;

avatarUrl?: MutualFollowerItemDtoAvatarUrl;
}
