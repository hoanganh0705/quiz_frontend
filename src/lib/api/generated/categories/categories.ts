

import type {
CategoryControllerCreateCategory201,
CategoryControllerDeleteCategory200,
CategoryControllerGetCategoryAnalytics200,
CategoryControllerGetCategoryById200,
CategoryControllerGetCategoryBySlug200,
CategoryControllerGetCategoryQuizzes200,
CategoryControllerGetCategoryQuizzesParams,
CategoryControllerGetPopularCategories200,
CategoryControllerGetPopularCategoriesParams,
CategoryControllerGetRelatedCategories200,
CategoryControllerGetRelatedCategoriesParams,
CategoryControllerGetTrendingCategories200,
CategoryControllerGetTrendingCategoriesParams,
CategoryControllerListCategories200,
CategoryControllerListCategoriesParams,
CategoryControllerRestoreCategory200,
CategoryControllerUpdateCategory200,
CreateCategoryDto,
UpdateCategoryDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getCategories = () => {

const categoryControllerGetPopularCategories = (
params?: CategoryControllerGetPopularCategoriesParams,
 ) => {
return orvalCustomInstance<CategoryControllerGetPopularCategories200>(
{url: `/api/v1/categories/popular`, method: 'GET',
params
    },
      );
    }

const categoryControllerGetTrendingCategories = (
params?: CategoryControllerGetTrendingCategoriesParams,
 ) => {
return orvalCustomInstance<CategoryControllerGetTrendingCategories200>(
{url: `/api/v1/categories/trending`, method: 'GET',
params
    },
      );
    }

const categoryControllerGetCategoryQuizzes = (
slug: string,
params?: CategoryControllerGetCategoryQuizzesParams,
 ) => {
return orvalCustomInstance<CategoryControllerGetCategoryQuizzes200>(
{url: `/api/v1/categories/${slug}/quizzes`, method: 'GET',
params
    },
      );
    }

const categoryControllerGetRelatedCategories = (
slug: string,
params?: CategoryControllerGetRelatedCategoriesParams,
 ) => {
return orvalCustomInstance<CategoryControllerGetRelatedCategories200>(
{url: `/api/v1/categories/${slug}/related`, method: 'GET',
params
    },
      );
    }

const categoryControllerGetCategoryAnalytics = (
id: string,
 ) => {
return orvalCustomInstance<CategoryControllerGetCategoryAnalytics200>(
{url: `/api/v1/categories/${id}/analytics`, method: 'GET'
    },
      );
    }

const categoryControllerFollowCategory = (
id: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/categories/${id}/follow`, method: 'POST'
    },
      );
    }

const categoryControllerUnfollowCategory = (
id: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/categories/${id}/follow`, method: 'DELETE'
    },
      );
    }

const categoryControllerRestoreCategory = (
id: string,
 ) => {
return orvalCustomInstance<CategoryControllerRestoreCategory200>(
{url: `/api/v1/categories/${id}/restore`, method: 'POST'
    },
      );
    }

const categoryControllerListCategories = (
params?: CategoryControllerListCategoriesParams,
 ) => {
return orvalCustomInstance<CategoryControllerListCategories200>(
{url: `/api/v1/categories`, method: 'GET',
params
    },
      );
    }

const categoryControllerCreateCategory = (
createCategoryDto: CreateCategoryDto,
 ) => {
return orvalCustomInstance<CategoryControllerCreateCategory201>(
{url: `/api/v1/categories`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: createCategoryDto
    },
      );
    }

const categoryControllerGetCategoryById = (
id: string,
 ) => {
return orvalCustomInstance<CategoryControllerGetCategoryById200>(
{url: `/api/v1/categories/${id}`, method: 'GET'
    },
      );
    }

const categoryControllerUpdateCategory = (
id: string,
updateCategoryDto: UpdateCategoryDto,
 ) => {
return orvalCustomInstance<CategoryControllerUpdateCategory200>(
{url: `/api/v1/categories/${id}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: updateCategoryDto
    },
      );
    }

const categoryControllerDeleteCategory = (
id: string,
 ) => {
return orvalCustomInstance<CategoryControllerDeleteCategory200>(
{url: `/api/v1/categories/${id}`, method: 'DELETE'
    },
      );
    }

const categoryControllerGetCategoryBySlug = (
slug: string,
 ) => {
return orvalCustomInstance<CategoryControllerGetCategoryBySlug200>(
{url: `/api/v1/categories/${slug}`, method: 'GET'
    },
      );
    }
return {categoryControllerGetPopularCategories,categoryControllerGetTrendingCategories,categoryControllerGetCategoryQuizzes,categoryControllerGetRelatedCategories,categoryControllerGetCategoryAnalytics,categoryControllerFollowCategory,categoryControllerUnfollowCategory,categoryControllerRestoreCategory,categoryControllerListCategories,categoryControllerCreateCategory,categoryControllerGetCategoryById,categoryControllerUpdateCategory,categoryControllerDeleteCategory,categoryControllerGetCategoryBySlug}};
export type CategoryControllerGetPopularCategoriesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetPopularCategories']>>>
export type CategoryControllerGetTrendingCategoriesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetTrendingCategories']>>>
export type CategoryControllerGetCategoryQuizzesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetCategoryQuizzes']>>>
export type CategoryControllerGetRelatedCategoriesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetRelatedCategories']>>>
export type CategoryControllerGetCategoryAnalyticsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetCategoryAnalytics']>>>
export type CategoryControllerFollowCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerFollowCategory']>>>
export type CategoryControllerUnfollowCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerUnfollowCategory']>>>
export type CategoryControllerRestoreCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerRestoreCategory']>>>
export type CategoryControllerListCategoriesResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerListCategories']>>>
export type CategoryControllerCreateCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerCreateCategory']>>>
export type CategoryControllerGetCategoryByIdResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetCategoryById']>>>
export type CategoryControllerUpdateCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerUpdateCategory']>>>
export type CategoryControllerDeleteCategoryResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerDeleteCategory']>>>
export type CategoryControllerGetCategoryBySlugResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getCategories>['categoryControllerGetCategoryBySlug']>>>
