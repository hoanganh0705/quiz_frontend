

import type { UserActivityItemDtoType } from './userActivityItemDtoType';
import type { UserActivityItemDtoActor } from './userActivityItemDtoActor';
import type { UserActivityItemDtoPayload } from './userActivityItemDtoPayload';

export interface UserActivityItemDto {

id: string;

type: UserActivityItemDtoType;

at: string;

actor: UserActivityItemDtoActor;

payload: UserActivityItemDtoPayload;
}
