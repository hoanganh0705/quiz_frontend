

import type { UserFollowerItemDtoAvatarUrl } from './userFollowerItemDtoAvatarUrl';

export interface UserFollowerItemDto {

userId: string;

username: string;

avatarUrl?: UserFollowerItemDtoAvatarUrl;

followedAt: string;
}
