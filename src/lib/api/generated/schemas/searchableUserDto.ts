

import type { SearchableUserDtoDisplayName } from './searchableUserDtoDisplayName';
import type { SearchableUserDtoAvatarUrl } from './searchableUserDtoAvatarUrl';

export interface SearchableUserDto {

userId: string;

username: string;

displayName?: SearchableUserDtoDisplayName;

avatarUrl?: SearchableUserDtoAvatarUrl;

isFriend: boolean;

hasPendingRequest: boolean;

isBlocked: boolean;
}
