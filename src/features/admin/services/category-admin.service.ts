/**
 * `features/admin/services/category-admin.service.ts` — Category admin service.
 *
 * Source epic:   Epic 7.1.
 * Source ticket: TKT-7.1.E2.
 *
 * Thin service layer that wraps the regenerated category admin SDK
 * functions. The service is the only layer under `features/admin/**`
 * that touches the SDK for category admin; every `features/admin/hooks/**`
 * consumer of category admin mutations imports from this service.
 *
 * ## Functions
 *
 *   - `createCategory(input)`   — wraps `categoryControllerCreateCategory`.
 *   - `updateCategory(id)`     — wraps `categoryControllerUpdateCategory`.
 *   - `deleteCategory(id)`     — wraps `categoryControllerDeleteCategory`.
 *   - `restoreCategory(id)`    — wraps `categoryControllerRestoreCategory`.
 *                                  May throw `CATEGORY_SLUG_CONFLICT`.
 *   - `getCategory(id)`        — wraps `categoryControllerGetCategoryById`.
 *
 * ## Error contract
 *
 * Each function propagates the SDK's `ApiError` directly. The
 * `ApiError.code` getter resolves to a typed `ErrorCode` from
 * `@/lib/api/error-codes`, including the Phase 7 codes registered
 * in `TKT-7.1.A3`.
 */

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

/** The canonical category DTO returned by every read/write category admin function. */
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

/**
 * Restore a soft-deleted category.
 *
 * @throws `ApiError<ErrorCode>` with `code: CATEGORY_SLUG_CONFLICT` when
 *         the soft-deleted category's slug has since been claimed by
 *         another category.
 * @throws `ApiError<ErrorCode>` with `code: CATEGORY_NOT_FOUND` when the
 *         category id does not exist (or has been hard-deleted).
 */
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
