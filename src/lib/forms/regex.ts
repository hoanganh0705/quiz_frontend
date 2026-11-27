import { z } from "zod";

export const SLUG_REGEX: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(value: string): boolean {
  return SLUG_REGEX.test(value);
}

export function deriveSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const TAG_SLUG_REGEX: RegExp = SLUG_REGEX;

export const isValidTagSlug = isValidSlug;

export const TAG_SLUG_INVALID_COPY =
  "Tags must be lowercase alphanumeric with optional hyphens (e.g. `world-history`).";

export const tagSlugSchema = z.string().regex(SLUG_REGEX, {
  message: TAG_SLUG_INVALID_COPY,
});

export type TagSlug = z.infer<typeof tagSlugSchema>;
