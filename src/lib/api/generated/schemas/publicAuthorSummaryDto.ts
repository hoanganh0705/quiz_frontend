

import type { PublicAuthorSummaryDtoDisplayName } from './publicAuthorSummaryDtoDisplayName';
import type { PublicAuthorSummaryDtoAvatarUrl } from './publicAuthorSummaryDtoAvatarUrl';

export interface PublicAuthorSummaryDto {

userId: string;

username: string;

displayName: PublicAuthorSummaryDtoDisplayName;

avatarUrl: PublicAuthorSummaryDtoAvatarUrl;
}
