

import type { WrappedPaginatedDtoDataItem } from './wrappedPaginatedDtoDataItem';
import type { PaginatedResponseMetaDto } from './paginatedResponseMetaDto';

export interface WrappedPaginatedDto {

data: WrappedPaginatedDtoDataItem[];
meta: PaginatedResponseMetaDto;
}
