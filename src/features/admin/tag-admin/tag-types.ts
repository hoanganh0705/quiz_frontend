/**
 * `features/admin/tag-admin/tag-types.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.B1.
 *
 * ## Purpose
 *
 * Single source of truth for all TypeScript types consumed by tag admin
 * hooks and components in Epic 7.3. This module:
 *   1. Re-exports the SDK DTOs for create/update/restore responses.
 *   2. Adds `TagListItem` and `DeletedTagListItem` discriminated-union
 *      members that narrow `TagResponseDto` with an explicit `deletedAt`
 *      field.
 *   3. Exports `TagAdminListItem` as the full union.
 *
 * ## `deletedAt` notes
 *
 * The current generated SDK's `TagResponseDto` does **not** include a
 * `deletedAt` field (verified against `src/lib/api/generated/schemas/tagResponseDto.ts`).
 * The backend contract for soft-deleted tags is unverified — see
 * `projectDocs/Tickets/Phase7/evidence/EPIC_7_3_A1.md` §6 row 8.
 *
 * `TagListItem` / `DeletedTagListItem` model the contract that the backend
 * _should_ return. If the backend returns `deletedAt` in `TagResponseDto`
 * after a SDK regeneration, these types must be updated to extend the
 * regenerated `TagResponseDto` directly instead of the stub above.
 *
 * ## Backward compatibility
 *
 * If the backend is not yet returning `deletedAt`, consumers using the
 * union must be tolerant: treat the absence of `deletedAt` as `deletedAt: null`
 * (i.e. `TagListItem`) until the backend ships.
 */

// ─── SDK DTOs (re-exports) ────────────────────────────────────────────────────

export type {
  /**
   * DTO for creating a tag. Mirrors `CreateTagDto` from the generated SDK.
   * Constraints enforced server-side: `name` min 1 / max 120, `slug` optional.
   */
  CreateTagDto,
} from '@/lib/api/generated/schemas';

export type {
  /**
   * DTO for updating a tag. Mirrors `UpdateTagDto` from the generated SDK.
   * Both `name` and `slug` are optional (PATCH semantics).
   */
  UpdateTagDto,
} from '@/lib/api/generated/schemas';

// ─── TagDto — canonical name for the response shape ────────────────────────────

/**
 * Canonical alias for the generated `TagResponseDto`.
 * Used throughout Epic 7.3 as the base tag shape.
 */
export type TagDto = import('@/lib/api/generated/schemas').TagResponseDto;

// ─── TagCreateDto / TagUpdateDto ───────────────────────────────────────────────

/**
 * Alias for `CreateTagDto` for use in admin surfaces.
 */
export type TagCreateDto = import('@/lib/api/generated/schemas').CreateTagDto;

/**
 * Alias for `UpdateTagDto` for use in admin surfaces.
 */
export type TagUpdateDto = import('@/lib/api/generated/schemas').UpdateTagDto;

// ─── TagCreateResponseDto ─────────────────────────────────────────────────────

/**
 * Response returned after successfully creating a tag.
 * Mirrors `TagControllerCreateTag201` (the wrapped `TagResponseDto`).
 */
export type TagCreateResponseDto = import('@/lib/api/generated/schemas').TagResponseDto;

// ─── TagRestoreResponseDto ─────────────────────────────────────────────────────

/**
 * Response returned after successfully restoring a soft-deleted tag.
 * Mirrors `TagControllerRestoreTag200` (the wrapped `TagResponseDto`).
 */
export type TagRestoreResponseDto = import('@/lib/api/generated/schemas').TagResponseDto;

// ─── Discriminated union for admin list items ─────────────────────────────────

/**
 * Base tag shape shared by both list-item variants.
 * Matches the generated `TagResponseDto` fields.
 */
interface TagBase {
  tagId: string;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * An active (non-deleted) tag in the admin list.
 *
 * `deletedAt` is explicitly `null` — the backend confirmed this tag has not
 * been soft-deleted.
 */
export interface TagListItem extends TagBase {
  deletedAt: null;
}

/**
 * A soft-deleted tag in the admin list.
 *
 * `deletedAt` is a non-null ISO 8601 timestamp indicating when the tag
 * was soft-deleted.
 *
 * **Backend contract note:** The current SDK's `TagResponseDto` does not
 * include `deletedAt`. This type models the expected shape after the
 * backend ships soft-delete support. Until then, no API response will
 * satisfy `DeletedTagListItem` — the field is an aspirational contract.
 */
export interface DeletedTagListItem extends TagBase {
  deletedAt: string;
}

/**
 * Discriminated union of active and soft-deleted tag list items.
 * Used by `TagAdminList` to render the two tabs.
 *
 * The discriminator is the `deletedAt` field:
 *   - `deletedAt === null`  → `TagListItem` (active)
 *   - `deletedAt === string` → `DeletedTagListItem` (soft-deleted)
 *
 * Use `tag.deletedAt !== null` or `tag.deletedAt === null` as the guard.
 */
export type TagAdminListItem = TagListItem | DeletedTagListItem;
