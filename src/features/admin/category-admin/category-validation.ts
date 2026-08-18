

import { isValidCategorySlug } from './category-slug-regex';
import type { CategoryAdminListItem } from './category-types';

export const CATEGORY_NAME_MIN_LENGTH = 1 as const;

export const CATEGORY_NAME_MAX_LENGTH = 120 as const;

export const CATEGORY_SLUG_MAX_LENGTH = 120 as const;

export const CATEGORY_DESCRIPTION_MAX_LENGTH = 500 as const;

export const CATEGORY_IMAGE_URL_MAX_LENGTH = 2048 as const;

export type CategoryNameValidationResult =
| { ok: true }
  | { ok: false; reason: 'empty' | 'too-long' };

export function validateCategoryName(name: string): CategoryNameValidationResult {
if (name.trim().length < CATEGORY_NAME_MIN_LENGTH) {
return { ok: false, reason: 'empty' };
  }
if (name.length > CATEGORY_NAME_MAX_LENGTH) {
return { ok: false, reason: 'too-long' };
  }
return { ok: true };
}

export type CategorySlugValidationResult =
| { ok: true }
  | { ok: false; reason: 'empty' | 'invalid' | 'too-long' };

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

export type CategoryDescriptionValidationResult =
| { ok: true }
  | { ok: false; reason: 'too-long' };

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

export type CategoryImageUrlValidationResult =
| { ok: true }
  | { ok: false; reason: 'too-long' | 'invalid-url' };

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