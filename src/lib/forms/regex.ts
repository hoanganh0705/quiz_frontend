/**
 * `lib/forms/regex.ts` — single source of truth for the tag-slug regex.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  Story 4.2 (PHASE_4_EPICS.md lines 202–293).
 * Source ticket: TKT-4.2.A5.
 *
 * The regex source string is byte-equal to the `@pattern` annotation on
 * `CreateQuizDto.slug` in the generated schema at
 * `src/lib/api/generated/schemas/createQuizDto.ts`:
 *
 *   `@pattern ^[a-z0-9]+(?:-[a-z0-9]+)*$`
 *
 * Every consumer that needs to validate a slug (e.g. `<TagMultiSelect />`)
 * imports from here, so a backend regeneration that changes the regex
 * produces a single diff in this file plus the spec assertion below.
 *
 * The zod helper is exported so consumers that compose this validation
 * into a larger form schema (e.g. `quizCreateFormSchema` in
 * `lib/forms/presets/`) can `.merge()` / `.extend()` instead of
 * re-declaring the regex.
 */

import { z } from 'zod';

/**
 * Tag / quiz slug regex. Mirrors `CreateQuizDto.slug`'s `@pattern`
 * annotation. Exported as a `RegExp` (not a string) so callers can use
 * it directly with `RegExp.test()` and `String.prototype.match()`.
 */
export const TAG_SLUG_REGEX: RegExp = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Convenience boolean wrapper around `TAG_SLUG_REGEX.test(value)`.
 */
export function isValidTagSlug(value: string): boolean {
  return TAG_SLUG_REGEX.test(value);
}

/**
 * User-facing copy used by the regex's failure messages. Centralised
 * so every consumer renders identical copy. Matches the master-plan
 * line 264 promise: "Tags must be lowercase alphanumeric with optional
 * hyphens (e.g. `world-history`)".
 */
export const TAG_SLUG_INVALID_COPY =
  'Tags must be lowercase alphanumeric with optional hyphens (e.g. `world-history`).';

/**
 * Zod schema that validates a single tag slug against `TAG_SLUG_REGEX`.
 * The error message is the centralised copy so the form primitive's
 * `<TagMultiSelect />` and any composited preset schema surface the
 * same string.
 */
export const tagSlugSchema = z.string().regex(TAG_SLUG_REGEX, {
  message: TAG_SLUG_INVALID_COPY,
});

/**
 * Inferred type for a validated tag slug. Identical to `string` at
 * runtime; useful for consumers that want to communicate the constraint
 * through their own types.
 */
export type TagSlug = z.infer<typeof tagSlugSchema>;