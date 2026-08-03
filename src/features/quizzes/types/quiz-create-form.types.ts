/**
 * `quiz-create-form.types.ts` — create-form-specific types.
 *
 * Source epic:   Epic 4.8 — Quiz create form.
 * Source ticket: TKT-4.8-A4.
 *
 * Types that are specific to the quiz-create flow and are not part
 * of the backend DTOs:
 *
 *   - `SlugAvailabilityResult`     — result of a slug availability check.
 *   - `TagResolutionResult`         — result of tag slugs → UUIDs resolution.
 *   - `CreateQuizSubmitPayload`   — the API payload shape (after tag
 *                                     resolution but before the service call).
 *   - `CreateQuizSuccessResult`    — the minimal quiz object returned on
 *                                     successful creation.
 *
 * ## Design decisions
 *
 * The form UI uses `tagSlugs: string[]` (the user selects tags by their
 * slugs from the picker). The backend DTO expects `tagIds: string[]`
 * (UUIDs). The submit handler resolves slugs → UUIDs before calling the
 * service. This file defines the types for that transformation.
 */

import type { CreateQuizDto } from '@/lib/api/generated/schemas';

// ─── Slug availability ──────────────────────────────────────────────────────

/**
 * Result of a slug availability check.
 *
 * `available: true` means the slug is not in use (GET returned 404).
 * `available: false` means the slug is taken (GET returned non-404).
 */
export interface SlugAvailabilityResult {
  available: boolean;
  slug: string;
}

// ─── Tag resolution ─────────────────────────────────────────────────────────

/**
 * Result of resolving an array of tag slugs to their UUIDs.
 *
 * `tagIds` is `null` when resolution is in progress or failed.
 * `error` is set when one or more slugs could not be resolved.
 */
export interface TagResolutionResult {
  tagIds: string[] | null;
  isResolving: boolean;
  error: string | null;
}

// ─── Submit payload ─────────────────────────────────────────────────────────

/**
 * The payload sent to `POST /quizzes` after tag slugs have been resolved.
 *
 * This is `CreateQuizDto` with the form-only `tagSlugs` replaced by the
 * resolved `tagIds`. The `acknowledgements` form-only field is stripped.
 */
export type CreateQuizSubmitPayload = Omit<CreateQuizDto, 'tagIds'> & {
  /** Resolved tag UUIDs. Omit when the user selected no tags. */
  tagIds?: string[];
};

// ─── Success result ─────────────────────────────────────────────────────────

/**
 * The minimal quiz data returned by `POST /quizzes` on success.
 * Used to drive client-side routing after form submission.
 */
export interface CreateQuizSuccessResult {
  id: string;
  slug: string;
}
