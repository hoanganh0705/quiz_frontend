

import type { BookmarkStatsResponseDtoFavoriteCategory } from './bookmarkStatsResponseDtoFavoriteCategory';
import type { BookmarkStatsResponseDtoFavoriteTag } from './bookmarkStatsResponseDtoFavoriteTag';

export interface BookmarkStatsResponseDto {

totalCollections: number;

totalBookmarks: number;

favoriteCategory?: BookmarkStatsResponseDtoFavoriteCategory;

favoriteTag?: BookmarkStatsResponseDtoFavoriteTag;
}
