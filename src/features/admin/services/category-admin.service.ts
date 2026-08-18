

import { getCategories } from '@/lib/api';
import type {
CategoryResponseDto,
CreateCategoryDto,
UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {
CategoryControllerCreateCategoryResult,
CategoryControllerUpdateCategoryResult,
CategoryControllerDeleteCategoryResult,
CategoryControllerRestoreCategoryResult,
CategoryControllerGetCategoryByIdResult,
} from '@/lib/api/generated/categories/categories';

export type CategoryDto = CategoryResponseDto;

export async function createCategory(
input: CreateCategoryDto,
): Promise<CategoryDto> {
const sdk = getCategories();
const wrapped = await sdk.categoryControllerCreateCategory(input);
return (wrapped.data.data as CategoryDto) ?? (wrapped.data as unknown as CategoryDto);
}

export async function updateCategory(
id: string,
input: UpdateCategoryDto,
): Promise<CategoryDto> {
const sdk = getCategories();
const wrapped = await sdk.categoryControllerUpdateCategory(id, input);
return (wrapped.data.data as CategoryDto) ?? (wrapped.data as unknown as CategoryDto);
}

export async function deleteCategory(id: string): Promise<void> {
const sdk = getCategories();
await sdk.categoryControllerDeleteCategory(id);
}

export async function restoreCategory(id: string): Promise<CategoryDto> {
const sdk = getCategories();
const wrapped = await sdk.categoryControllerRestoreCategory(id);
return (wrapped.data.data as CategoryDto) ?? (wrapped.data as unknown as CategoryDto);
}

export async function getCategory(id: string): Promise<CategoryDto> {
const sdk = getCategories();
const wrapped = await sdk.categoryControllerGetCategoryById(id);
return (wrapped.data.data as CategoryDto) ?? (wrapped.data as unknown as CategoryDto);
}
