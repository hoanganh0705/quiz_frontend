

import type { InstanceListItemDto } from './instanceListItemDto';
import type { InstanceListPaginationDto } from './instanceListPaginationDto';

export interface InstanceListResponseDto {

items: InstanceListItemDto[];

pagination: InstanceListPaginationDto;
}
