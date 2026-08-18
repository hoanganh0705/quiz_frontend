

export type {

CreateTagDto,
} from '@/lib/api/generated/schemas';

export type {

UpdateTagDto,
} from '@/lib/api/generated/schemas';

export type TagDto = import('@/lib/api/generated/schemas').TagResponseDto;

export type TagCreateDto = import('@/lib/api/generated/schemas').CreateTagDto;

export type TagUpdateDto = import('@/lib/api/generated/schemas').UpdateTagDto;

export type TagCreateResponseDto = import('@/lib/api/generated/schemas').TagResponseDto;

export type TagRestoreResponseDto = import('@/lib/api/generated/schemas').TagResponseDto;

interface TagBase {
tagId: string;
name: string;
slug: string;
createdAt: string;
updatedAt: string;
}

export interface TagListItem extends TagBase {
deletedAt: null;
}

export interface DeletedTagListItem extends TagBase {
deletedAt: string;
}

export type TagAdminListItem = TagListItem | DeletedTagListItem;
