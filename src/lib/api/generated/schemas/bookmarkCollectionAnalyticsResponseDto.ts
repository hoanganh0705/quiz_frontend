

import type { BookmarkCollectionAnalyticsSummaryDto } from './bookmarkCollectionAnalyticsSummaryDto';
import type { BookmarkCollectionAnalyticsTopCategoryDto } from './bookmarkCollectionAnalyticsTopCategoryDto';
import type { BookmarkCollectionAnalyticsTopTagDto } from './bookmarkCollectionAnalyticsTopTagDto';

export interface BookmarkCollectionAnalyticsResponseDto {

collectionId: string;

collectionName: string;

summary: BookmarkCollectionAnalyticsSummaryDto;

topCategories: BookmarkCollectionAnalyticsTopCategoryDto[];

topTags: BookmarkCollectionAnalyticsTopTagDto[];

lastUpdated: string;
}
