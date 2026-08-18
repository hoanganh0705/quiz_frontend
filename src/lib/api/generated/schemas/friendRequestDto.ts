

import type { FriendRequestDtoRequesterDisplayName } from './friendRequestDtoRequesterDisplayName';
import type { FriendRequestDtoRequesterAvatarUrl } from './friendRequestDtoRequesterAvatarUrl';

export interface FriendRequestDto {

friendshipId: string;

requesterId: string;

addresseeId: string;

requesterUsername: string;

requesterDisplayName?: FriendRequestDtoRequesterDisplayName;

requesterAvatarUrl?: FriendRequestDtoRequesterAvatarUrl;

createdAt: string;
}
