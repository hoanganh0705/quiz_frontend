/**
 * `features/admin/tag-admin/tag-validation.ts`
 *
 * Source epic:   Epic 7.3.
 * Source ticket: TKT-7.3.B3.
 *
 * ## Purpose
 *
 * Single module owning all client-side validation rules for tag admin
 * forms. Provides:
 *   1. Named length constants mirroring the backend.
 *   2. `validateTagName` — min/max length check.
 *   3. `validateTagSlug` — regex pattern + length check.
 *   4. `isTagSlugTaken` — local uniqueness pre-check against the
 *      loaded admin list, used as a non-blocking warning so the form
 *      can surface a slug conflict before the user submits.
 *
 * ## Server is authoritative
 *
 * Every rule here is a UX affordance. The server is always the
 * authoritative validator. A slug that passes all client checks may
 * still fail with `TAG_SLUG_CONFLICT` if another admin creates the
 * same tag between the pre-check and the mutation.
 */

import { isValidTagSlug } from './tag-slug-regex';
import type { TagAdminListItem } from './tag-types';

// ─── Length constants ─────────────────────────────────────────────────────────

/** Mirrors `CreateTagDto` `@minLength 1` and `@maxLength 120`. */
export const TAG_NAME_MIN_LENGTH = 1 as const;

/** Mirrors `CreateTagDto` `@maxLength 120`. */
export const TAG_NAME_MAX_LENGTH = 120 as const;

/** Mirrors `CreateTagDto` `@maxLength 120` on the `slug` field. */
export const TAG_SLUG_MAX_LENGTH = 120 as const;

// ─── Name validation ───────────────────────────────────────────────────────────

export type TagNameValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'too-long' };

/**
 * Validates a tag name against client-side rules.
 *
 * Checks (in order):
 *   1. Not empty / whitespace-only.
 *   2. Not exceeding `TAG_NAME_MAX_LENGTH`.
 *
 * @param name - The tag name to validate.
 */
export function validateTagName(name: string): TagNameValidationResult {
  if (name.trim().length < TAG_NAME_MIN_LENGTH) {
    return { ok: false, reason: 'empty' };
  }
  if (name.length > TAG_NAME_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  return { ok: true };
}

// ─── Slug validation ───────────────────────────────────────────────────────────

export type TagSlugValidationResult =
  | { ok: true }
  | { ok: false; reason: 'empty' | 'invalid' | 'too-long' };

/**
 * Validates a tag slug against client-side rules.
 *
 * Checks (in order):
 *   1. Not empty.
 *   2. Matches the canonical `TAG_SLUG_REGEX` (lowercase, kebab-case).
 *   3. Not exceeding `TAG_SLUG_MAX_LENGTH`.
 *
 * @param slug - The slug to validate.
 */
export function validateTagSlug(slug: string): TagSlugValidationResult {
  if (slug.trim().length === 0) {
    return { ok: false, reason: 'empty' };
  }
  if (!isValidTagSlug(slug)) {
    return { ok: false, reason: 'invalid' };
  }
  if (slug.length > TAG_SLUG_MAX_LENGTH) {
    return { ok: false, reason: 'too-long' };
  }
  return { ok: true };
}

// ─── Local slug uniqueness pre-check ──────────────────────────────────────────

/**
 * Returns `true` if a slug is already taken by another tag in the list.
 *
 * The check is case-insensitive. By default, every tag in `list` is
 * considered a conflict. Pass `excludeTagId` to skip a tag that is
 * currently being edited (so renaming a tag to the same slug does not
 * falsely conflict with itself).
 *
 * This is a **non-blocking warning** — it avoids obvious 409s but does
 * not replace the server's authoritative uniqueness check.
 *
 * @param slug - The slug to check (case-insensitive).
 * @param list - The currently loaded admin tag list.
 * @param excludeTagId - Tag ID to exclude from the conflict check.
 */
export function isTagSlugTaken(
  slug: string,
  list: readonly TagAdminListItem[],
  excludeTagId?: string,
): boolean {
  const normalised = slug.toLowerCase();
  return list.some(
    (tag) =>
      tag.slug.toLowerCase() === normalised &&
      tag.tagId !== excludeTagId,
  );
}
