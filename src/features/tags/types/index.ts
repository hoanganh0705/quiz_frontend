

import type { TagResponseDto, CreateTagDto, UpdateTagDto, DeleteTagResponseDto } from '@/lib/api/generated/schemas';
export type { TagResponseDto, CreateTagDto, UpdateTagDto, DeleteTagResponseDto };

export type {
TagControllerListTagsResult,
TagControllerCreateTagResult,
TagControllerGetTagBySlugResult,
TagControllerUpdateTagResult,
TagControllerDeleteTagResult,
} from '@/lib/api/generated/tags/tags';

export type Tag = TagResponseDto;
