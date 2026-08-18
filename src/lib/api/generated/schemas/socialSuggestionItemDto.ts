

import type { SocialSuggestionItemDtoAvatarUrl } from './socialSuggestionItemDtoAvatarUrl';
import type { SocialSuggestionItemDtoReason } from './socialSuggestionItemDtoReason';
import type { SocialSuggestionItemDtoReasonLabel } from './socialSuggestionItemDtoReasonLabel';

export interface SocialSuggestionItemDto {

userId: string;

username: string;

avatarUrl: SocialSuggestionItemDtoAvatarUrl;

mutualFriends: number;

mutualFollowers: number;

reason: SocialSuggestionItemDtoReason;

reasonLabel?: SocialSuggestionItemDtoReasonLabel;
}
