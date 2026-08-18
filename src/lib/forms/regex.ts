

import { z } from 'zod';

export const TAG_SLUG_REGEX: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidTagSlug(value: string): boolean {
return TAG_SLUG_REGEX.test(value);
}

export const TAG_SLUG_INVALID_COPY =
'Tags must be lowercase alphanumeric with optional hyphens (e.g. `world-history`).';

export const tagSlugSchema = z.string().regex(TAG_SLUG_REGEX, {
message: TAG_SLUG_INVALID_COPY,
});

export type TagSlug = z.infer<typeof tagSlugSchema>;