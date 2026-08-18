

import type { SocialFeedItemDtoType } from './socialFeedItemDtoType';
import type { SocialFeedUserDto } from './socialFeedUserDto';
import type { SocialFeedItemDtoActor } from './socialFeedItemDtoActor';
import type { SocialFeedItemDtoPayload } from './socialFeedItemDtoPayload';

export interface SocialFeedItemDto {

id: string;

type: SocialFeedItemDtoType;

at: string;

user: SocialFeedUserDto;

actor: SocialFeedItemDtoActor;

payload: SocialFeedItemDtoPayload;
}
