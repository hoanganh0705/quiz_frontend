

import type { AuthorDtoDisplayName } from './authorDtoDisplayName';
import type { AuthorDtoAvatarUrl } from './authorDtoAvatarUrl';

export interface AuthorDto {

userId: string;

username: string;

displayName: AuthorDtoDisplayName;

avatarUrl: AuthorDtoAvatarUrl;
}
