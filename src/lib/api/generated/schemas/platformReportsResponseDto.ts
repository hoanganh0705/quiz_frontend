

import type { PlatformReportItemDto } from './platformReportItemDto';
import type { PlatformReportsPaginationDto } from './platformReportsPaginationDto';

export interface PlatformReportsResponseDto {

items: PlatformReportItemDto[];

pagination: PlatformReportsPaginationDto;
}
