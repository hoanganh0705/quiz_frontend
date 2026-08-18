

import type { UserFollowingItemDtoAvatarUrl } from './userFollowingItemDtoAvatarUrl';

export interface UserFollowingItemDto {

userId: string;

username: string;

avatarUrl?: UserFollowingItemDtoAvatarUrl;

followedAt: string;
}
