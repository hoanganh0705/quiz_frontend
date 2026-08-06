/**
 * `features/admin/category-admin/category-types.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B1.
 *
 * ## Purpose
 *
 * Single source of truth for all TypeScript types consumed by category
 * admin hooks and components in Epic 7.4. This module:
 *   1. Re-exports the SDK DTOs for create/update/restore responses.
 *   2. Adds `CategoryListItem` and `DeletedCategoryListItem`
 *      discriminated-union members that narrow `CategoryResponseDto`
 *      with an explicit `deletedAt` field.
 *   3. Exports `CategoryAdminListItem` as the full union.
 *
 * ## `deletedAt` notes
 *
 * The current generated SDK's `CategoryResponseDto` does **not** include
 * a `deletedAt` field (verified against
 * `src/lib/api/generated/schemas/categoryResponseDto.ts`). The backend
 * contract for soft-deleted categories is recorded in
 * `projectDocs/Tickets/Phase7/evidence/EPIC_7_4_A1.md` §4.
 *
 * `CategoryListItem` / `DeletedCategoryListItem` model the contract that
 * the backend _should_ return. If the backend adds `deletedAt` to
 * `CategoryResponseDto` after a SDK regeneration, these types must be
 * updated to extend the regenerated `CategoryResponseDto` directly
 * instead of the stub below.
 *
 * ## Backward compatibility
 *
 * If the backend is not yet returning `deletedAt`, consumers using the
 * union must be tolerant: treat the absence of `deletedAt` as
 * `deletedAt: null` (i.e. `CategoryListItem`) until the backend ships.
 */

// ─── SDK DTOs (re-exports) ────────────────────────────────────────────────────

export type {
  /**
   * DTO for creating a category. Mirrors `CreateCategoryDto` from the
   * generated SDK.
   * Constraints enforced server-side: `name` min 1 / max 120,
   * `description` max 500 nullable, `slug` optional with regex
   * `^[a-z0-9]+(?:-[a-z0-9]+)*$` and max 120, `imageUrl` max 2048 nullable.
   */
  CreateCategoryDto,
} from '@/lib/api/generated/schemas';

export type {
  /**
   * DTO for updating a category. Mirrors `UpdateCategoryDto` from the
   * generated SDK. All fields are optional (PATCH semantics).
   */
  UpdateCategoryDto,
} from '@/lib/api/generated/schemas';

// ─── CategoryDto — canonical name for the response shape ──────────────────────

/**
 * Canonical alias for the generated `CategoryResponseDto`.
 * Used throughout Epic 7.4 as the base category shape.
 */
export type CategoryDto = import('@/lib/api/generated/schemas').CategoryResponseDto;

// ─── CategoryCreateDto / CategoryUpdateDto ────────────────────────────────────

/**
 * Alias for `CreateCategoryDto` for use in admin surfaces.
 */
export type CategoryCreateDto = import('@/lib/api/generated/schemas').CreateCategoryDto;

/**
 * Alias for `UpdateCategoryDto` for use in admin surfaces.
 */
export type CategoryUpdateDto = import('@/lib/api/generated/schemas').UpdateCategoryDto;

// ─── CategoryCreateResponseDto ───────────────────────────────────────────────

/**
 * Response returned after successfully creating a category.
 * Mirrors `CategoryControllerCreateCategory201` (the wrapped
 * `CategoryResponseDto`).
 */
export type CategoryCreateResponseDto =
  import('@/lib/api/generated/schemas').CategoryResponseDto;

// ─── CategoryRestoreResponseDto ──────────────────────────────────────────────

/**
 * Response returned after successfully restoring a soft-deleted category.
 * Mirrors `CategoryControllerRestoreCategory200` (the wrapped
 * `CategoryResponseDto`).
 */
export type CategoryRestoreResponseDto =
  import('@/lib/api/generated/schemas').CategoryResponseDto;

// ─── Discriminated union for admin list items ─────────────────────────────────

/**
 * Base category shape shared by both list-item variants.
 *
 * Matches the generated `CategoryResponseDto` fields (verified in A1):
 *   - `categoryId`     unique id
 *   - `name`           display name
 *   - `description`    optional cover copy (nullable, max 500)
 *   - `slug`           URL-friendly slug (regex, max 120)
 *   - `imageUrl`       optional cover image URL (nullable, max 2048)
 *   - `createdAt`      ISO 8601
 *   - `updatedAt`      ISO 8601
 */
interface CategoryBase {
  categoryId: string;
  name: string;
  description?: string | null;
  slug: string;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * An active (non-deleted) category in the admin list.
 *
 * `deletedAt` is explicitly `null` — the backend confirmed this
 * category has not been soft-deleted.
 */
export interface CategoryListItem extends CategoryBase {
  deletedAt: null;
}

/**
 * A soft-deleted category in the admin list.
 *
 * `deletedAt` is a non-null ISO 8601 timestamp indicating when the
 * category was soft-deleted.
 *
 * **Backend contract note:** The current SDK's `CategoryResponseDto`
 * does not include `deletedAt`. This type models the expected shape
 * after the backend ships soft-delete support. Until then, no API
 * response will satisfy `DeletedCategoryListItem` — the field is an
 * aspirational contract.
 */
export interface DeletedCategoryListItem extends CategoryBase {
  deletedAt: string;
}

/**
 * Discriminated union of active and soft-deleted category list items.
 * Used by `CategoryAdminList` to render the two tabs.
 *
 * The discriminator is the `deletedAt` field:
 *   - `deletedAt === null`  → `CategoryListItem` (active)
 *   - `deletedAt === string` → `DeletedCategoryListItem` (soft-deleted)
 *
 * Use `category.deletedAt !== null` or `category.deletedAt === null` as
 * the guard.
 */
export type CategoryAdminListItem = CategoryListItem | DeletedCategoryListItem;