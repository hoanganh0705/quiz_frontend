

import { isValidTagSlug } from './tag-slug-regex';
import type { TagAdminListItem } from './tag-types';

export const TAG_NAME_MIN_LENGTH = 1 as const;

export const TAG_NAME_MAX_LENGTH = 120 as const;

export const TAG_SLUG_MAX_LENGTH = 120 as const;

export type TagNameValidationResult =
| { ok: true }
  | { ok: false; reason: 'empty' | 'too-long' };

export function validateTagName(name: string): TagNameValidationResult {
if (name.trim().length < TAG_NAME_MIN_LENGTH) {
return { ok: false, reason: 'empty' };
  }
if (name.length > TAG_NAME_MAX_LENGTH) {
return { ok: false, reason: 'too-long' };
  }
return { ok: true };
}

export type TagSlugValidationResult =
| { ok: true }
  | { ok: false; reason: 'empty' | 'invalid' | 'too-long' };

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
