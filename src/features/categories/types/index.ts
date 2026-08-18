

import { CategoryResponseDto, CategoryControllerListCategories200 } from '@/lib/api/generated/schemas';

export type {
CreateCategoryDto,
UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {
CategoryControllerListCategoriesResult,
CategoryControllerCreateCategoryResult,
CategoryControllerGetCategoryBySlugResult,
CategoryControllerUpdateCategoryResult,
CategoryControllerDeleteCategoryResult,
} from '@/lib/api/generated/categories/categories';

export type Category = CategoryResponseDto;
export type CategoryListResponse = CategoryControllerListCategories200;
