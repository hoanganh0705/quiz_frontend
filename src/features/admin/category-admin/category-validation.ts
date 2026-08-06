/**
 * `features/admin/category-admin/category-validation.ts`
 *
 * Source epic:   Epic 7.4.
 * Source ticket: TKT-7.4.B3.
 *
 * ## Purpose
 *
 * Single module owning all client-side validation rules for category
 * admin forms. Provides:
 *   1. Named length constants mirroring the backend (verified in A1).
 *   2. `validateCategoryName` — min/max length check.
 *   3. `validateCategorySlug` — regex pattern + length check.
 *   4. `validateCategoryDescription` — max-length check (optional
 *      input; the backend marks `description` nullable).
 *   5. `validateCategoryImageUrl` — max-length + URL format check
 *      (the backend stores the cover image under `imageUrl`; the
 *      Phase 7 plan refers to this field as "icon"; Epic 7.4 treats
 *      them as the same field).
 *   6. `isCategorySlugTaken` — local uniqueness pre-check against the
 *      loaded admin list, used as a non-blocking warning so the form
 *      can surface a slug conflict before the user submits.
 *
 * ## Fields intentionally omitted
 *
 *   - `parentId` (nested categories) — NOT present on the regenerated
 *     `CreateCategoryDto` / `UpdateCategoryDto` (verified in A1
 *     evidence §4). The validation module does not export a
 *     `validateCategoryParentId` until the backend ships the field.
 *
 * ## Server is authoritative
 *
 * Every rule here is a UX affordance. The server is always the
 * authoritative validator. A slug that passes all client checks may
 * still fail with `CATEGORY_SLUG_CONFLICT` if another admin creates
 * the same category between the pre-check and the mutation.
 */

import { isValidCategorySlug } from './category-slug-regex';
import type { CategoryAdminListItem } from './category-types';

// ─── Length constants ─────────────────────────────────────────────────────────

/** Mirrors `CreateCategoryDto.name` `@minLength 1`. */
export const CATEGORY_NAME_MIN_LENGTH = 1 as const;

/** Mirrors `CreateCategoryDto.name` `@maxLength 120`. */
export const CATEGORY_NAME_MAX_LENGTH = 120 as const;

/** Mirrors `CreateCategoryDto.slug` `@maxLength 120`. */
export const CATEGORY_SLUG_MAX_LENGTH = 120 as const;

/** Mirrors `CreateCategoryDto.description` `@maxLength 500`. */
export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500 as const;

/** Mirrors `CreateCategoryDto.imageUrl` `@maxLength 2048`. */
export const CATEGORY_IMAGE_URL_MAX_LENGTH = 2048 as const;

// ─── Name validation ───────────────────────────────────────────────────────────

export type CategoryNameValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'too-long' };

/**
 * Validates a category name against client-side rules.
 *
 * Checks (in order):
 *   1. Not empty / whitespace-only.
 *   2. Not exceeding `CATEGORY_NAME_MAX_LENGTH`.
 *
 * @param name - The category name to validate.
 */
export function validateCategoryName(name: string): CategoryNameValidationResult {
  if (name.trim().length < CATEGORY_NAME_MIN_LENGTH) {
    return { ok: false, reason: 'empty' };
  }
  if (name.length > CATEGORY_NAME_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  return { ok: true };
}

// ─── Slug validation ───────────────────────────────────────────────────────────

export type CategorySlugValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'invalid' | 'too-long' };

/**
 * Validates a category slug against client-side rules.
 *
 * Checks (in order):
 *   1. Not empty.
 *   2. Matches the canonical `CATEGORY_SLUG_REGEX` (lowercase, kebab-case).
 *   3. Not exceeding `CATEGORY_SLUG_MAX_LENGTH`.
 *
 * @param slug - The slug to validate.
 */
export function validateCategorySlug(
  slug: string,
): CategorySlugValidationResult {
  if (slug.trim().length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (!isValidCategorySlug(slug)) {
    return { ok: false, reason: 'invalid' };
  }
  if (slug.length > CATEGORY_SLUG_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  return { ok: true };
}

// ─── Description validation ───────────────────────────────────────────────────

export type CategoryDescriptionValidationResult =
  | { ok: true }
  | { ok: false; reason: 'too-long' };

/**
 * Validates a category description against client-side rules.
 *
 * The backend allows `null` for `description`; the caller passes
 * `null` (or an empty string after trimming) to skip the length
 * check and receive `{ ok: true }`.
 *
 * Checks (in order):
 *   1. `null` / empty / whitespace-only → `{ ok: true }` (the field
 *      is optional and nullable per A1 evidence §4).
 *   2. Not exceeding `CATEGORY_DESCRIPTION_MAX_LENGTH`.
 *
 * @param description - The description to validate. May be `null`.
 */
export function validateCategoryDescription(
  description: string | null,
): CategoryDescriptionValidationResult {
  if (description === null) {
    return { ok: true };
  }
  if (description.trim().length === 0) {
    return { ok: true };
  }
  if (description.length > CATEGORY_DESCRIPTION_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  return { ok: true };
}

// ─── Image URL validation ──────────────────────────────────────────────────────

export type CategoryImageUrlValidationResult =
  | { ok: true }
  | { ok: false; reason: 'too-long' | 'invalid-url' };

/**
 * Validates a category image URL against client-side rules.
 *
 * The backend stores the cover image under `imageUrl`; the Phase 7
 * plan refers to this field as "icon"; Epic 7.4 treats them as the
 * same field. `null` is accepted as "no image".
 *
 * Checks (in order):
 *   1. `null` / empty / whitespace-only → `{ ok: true }` (the field
 *      is optional and nullable per A1 evidence §4).
 *   2. Length does not exceed `CATEGORY_IMAGE_URL_MAX_LENGTH` (2048).
 *   3. URL parses via the `URL` constructor with `http:` or `https:`
 *      protocol (the only protocols the backend will accept).
 *
 * @param imageUrl - The URL to validate. May be `null`.
 */
export function validateCategoryImageUrl(
  imageUrl: string | null,
): CategoryImageUrlValidationResult {
  if (imageUrl === null) {
    return { ok: true };
  }
  if (imageUrl.trim().length === 0) {
    return { ok: true };
  }
  if (imageUrl.length > CATEGORY_IMAGE_URL_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    return { ok: false, reason: 'invalid-url' };
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { ok: false, reason: 'invalid-url' };
  }
  return { ok: true };
}

// ─── Local slug uniqueness pre-check ──────────────────────────────────────────

/**
 * Returns `true` if a slug is already taken by another category in the
 * list.
 *
 * The check is case-insensitive. By default, every category in `list`
 * is considered a conflict. Pass `excludeCategoryId` to skip a
 * category that is currently being edited (so renaming a category to
 * the same slug does not falsely conflict with itself).
 *
 * This is a **non-blocking warning** — it avoids obvious 409s but
 * does not replace the server's authoritative uniqueness check.
 *
 * @param slug - The slug to check (case-insensitive).
 * @param list - The currently loaded admin category list.
 * @param excludeCategoryId - Category ID to exclude from the conflict
 *   check.
 */
export function isCategorySlugTaken(
  slug: string,
  list: readonly CategoryAdminListItem[],
  excludeCategoryId?: string,
): boolean {
  const normalised = slug.toLowerCase();
  return list.some(
    (category) =>
      category.slug.toLowerCase() === normalised &&
      category.categoryId !== excludeCategoryId,
  );
}