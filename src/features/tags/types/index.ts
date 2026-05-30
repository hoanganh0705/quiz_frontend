// Tags types — aligned with backend DTOs

// Re-export from generated SDK
export type {
  TagResponseDto,
  TagListResponseDto,
  TagPaginationResponseDto,
  CreateTagDto,
  UpdateTagDto,
  DeleteTagResponseDto,
} from '@/lib/api/generated/schemas';

export type {
  TagControllerListTagsResult,
  TagControllerCreateTagResult,
  TagControllerGetTagBySlugResult,
  TagControllerUpdateTagResult,
  TagControllerDeleteTagResult,
} from '@/lib/api/generated/tags/tags';

// Backward compatibility aliases
export type Tag = TagResponseDto;
export type TagListResponse = TagPaginationResponseDto;
