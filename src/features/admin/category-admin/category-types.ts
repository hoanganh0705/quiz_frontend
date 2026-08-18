

export type {

CreateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {

UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

export type CategoryDto = import('@/lib/api/generated/schemas').CategoryResponseDto;

export type CategoryCreateDto = import('@/lib/api/generated/schemas').CreateCategoryDto;

export type CategoryUpdateDto = import('@/lib/api/generated/schemas').UpdateCategoryDto;

export type CategoryCreateResponseDto =
import('@/lib/api/generated/schemas').CategoryResponseDto;

export type CategoryRestoreResponseDto =
import('@/lib/api/generated/schemas').CategoryResponseDto;

interface CategoryBase {
categoryId: string;
name: string;
description?: string | null;
slug: string;
imageUrl?: string | null;
createdAt: string;
updatedAt: string;
}

export interface CategoryListItem extends CategoryBase {
deletedAt: null;
}

export interface DeletedCategoryListItem extends CategoryBase {
deletedAt: string;
}

export type CategoryAdminListItem = CategoryListItem | DeletedCategoryListItem;