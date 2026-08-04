/**
 * `lib/forms/presets/` — Phase 4 form-schema presets.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 * Source ticket: TKT-4.2.D1.
 *
 * ## What this module owns
 *
 * Six form-schema presets — one per authoring surface Phase 4 ships.
 * Every preset is a `z.object({ … })` that consumers pass to
 * `useQuizForm({ schema })`. The presets are hand-authored against
 * the generated TypeScript DTOs at
 * `src/lib/api/generated/schemas/`. The generated SDK does NOT yet
 * ship Zod schemas (the OpenAPI generator is configured for TypeScript
 * types only), so the presets translate each DTO's `@minLength`,
 * `@maxLength`, `@minimum`, `@maximum`, `@pattern`, and `nullable`
 * annotations into equivalent zod primitives.
 *
 * ## What this module does NOT own
 *
 *   - **Generated Zod schemas.** The orval config currently emits
 *     TypeScript-only DTOs. If a future regeneration switches to zod,
 *     each preset becomes a `.extend()` of the generated schema rather
 *     than a hand-rolled object. The `// TODO: derive from generated
 *     zod schema once the orval config emits zod` comments mark the
 *     replacement points.
 *   - **Cross-field validation** (e.g. "end > start"). Cross-field
 *     checks live in `useQuizForm.submit()`'s `submit` handler seam.
 *   - **DTOs themselves.** The generated DTOs are imported for type
 *     alignment only.
 *
 * ## The 6 presets
 *
 *   - `quizCreateFormSchema`    — `POST /quizzes` (story 4.8).
 *   - `versionEditFormSchema`   — `PATCH /quizzes/:id/versions/:n` (story 4.9).
 *   - `questionFormSchema`      — `POST /quizzes/:id/versions/:n/questions` (story 4.10, single row).
 *   - `bulkQuestionsFormSchema` — bulk-create wrapper (story 4.10).
 *   - `reviewFormSchema`        — `POST /quizzes/:id/reviews` (story 4.13).
 *   - `commentFormSchema`       — `POST /quizzes/:id/comments` (story 4.12).
 *
 * ## Cross-batch invariant 11 (test isolation)
 *
 * Every preset exposes an inferred type via `z.infer<…>`. The
 * `__tests__/index.spec.ts` file asserts that each preset's inferred
 * type aligns with the corresponding generated DTO type.
 */

import { z } from 'zod';

import { tagSlugSchema } from '@/lib/forms/regex';
import { CreateInitialQuizVersionDtoDifficulty } from '@/lib/api/generated/schemas/createInitialQuizVersionDtoDifficulty';
import {
  QUESTION_TYPE_VALUES,
  type QuestionType,
} from '@/components/primitives/form/QuestionTypeSelect';

// ────────────────────────────────────────────────────────────────────────
// Shared sub-schemas (the building blocks the presets compose).
// ────────────────────────────────────────────────────────────────────────

/**
 * `CreateInitialQuizVersionDto` — the four-field payload that every
 * quiz must include on creation. Mirrors the generated type at
 * `src/lib/api/generated/schemas/createInitialQuizVersionDto.ts`.
 *
 *   - `difficulty`: `easy | medium | hard` (from
 *     `CreateInitialQuizVersionDtoDifficulty`).
 *   - `durationMs`: integer ≥ 1.
 *   - `passingScorePercent`: integer 0–100.
 *   - `rewardXp`: integer ≥ 0.
 */
export const initialQuizVersionFormSchema = z.object({
  difficulty: z.nativeEnum(CreateInitialQuizVersionDtoDifficulty),
  durationMs: z
    .number({ error: 'Duration must be a positive number.' })
    .int('Duration must be a whole number of milliseconds.')
    .min(1, 'Duration must be at least 1 ms.'),
  passingScorePercent: z
    .number({
      error: 'Passing score must be a number between 0 and 100.',
    })
    .int('Passing score must be a whole percentage.')
    .min(0, 'Passing score cannot be negative.')
    .max(100, 'Passing score cannot exceed 100.'),
  rewardXp: z
    .number({ error: 'Reward XP must be a non-negative number.' })
    .int('Reward XP must be a whole number.')
    .min(0, 'Reward XP cannot be negative.'),
});

/**
 * `CreateQuizAnswerOptionDto` — the per-row answer payload for a
 * question. Mirrors the generated type at
 * `src/lib/api/generated/schemas/createQuizAnswerOptionDto.ts`.
 *
 *   - `position`: integer ≥ 1.
 *   - `value`: string, 1–1000 chars.
 *   - `isCorrect`: boolean.
 */
export const quizAnswerOptionFormSchema = z.object({
  position: z
    .number({ error: 'Option position must be a positive integer.' })
    .int('Option position must be a whole number.')
    .min(1, 'Option position must be at least 1.'),
  value: z
    .string({ error: 'Option text is required.' })
    .min(1, 'Option text cannot be empty.')
    .max(1000, 'Option text cannot exceed 1000 characters.'),
  isCorrect: z.boolean({
    error: 'Option correctness must be a boolean.',
  }),
});

/**
 * `CreateQuizQuestionDto` — the per-question payload. Mirrors the
 * generated type at
 * `src/lib/api/generated/schemas/createQuizQuestionDto.ts`.
 *
 *   - `position`: integer ≥ 1.
 *   - `questionText`: string, 1–2000 chars.
 *   - `imageUrl?: string | null`: optional URL, ≤ 2048 chars.
 *   - `answerOptions`: object (the docs use this single-object shape;
 *     the spec mirrors it for type alignment).
 */
export const quizQuestionFormSchema = z.object({
  position: z
    .number({ error: 'Question position must be a positive integer.' })
    .int('Question position must be a whole number.')
    .min(1, 'Question position must be at least 1.'),
  questionText: z
    .string({ error: 'Question text is required.' })
    .min(1, 'Question text cannot be empty.')
    .max(2000, 'Question text cannot exceed 2000 characters.'),
  imageUrl: z
    .string()
    .max(2048, 'Image URL cannot exceed 2048 characters.')
    .url('Image URL must be a valid URL.')
    .nullable()
    .optional(),
  answerOptions: quizAnswerOptionFormSchema,
  // The form-only field: the question type drives the editor surface
  // (story 4.10). It is not part of the DTO; the backend does not
  // receive it.
  questionType: z.enum(QUESTION_TYPE_VALUES).default('single_choice'),
});

// ────────────────────────────────────────────────────────────────────────
// 1. quizCreateFormSchema — `POST /quizzes` (story 4.8)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the quiz-create authoring form (story 4.8).
 *
 * Composes:
 *   - The required `CreateQuizDto` fields (`title`, `description`,
 *     `slug`, `requirements`, `imageUrl`, `isFeatured`, `isHidden`,
 *     `categoryId`, `tagIds`, `initialVersion`).
 *   - Form-only fields (`tagSlugs`, `acknowledgements`).
 *
 * ## Field mapping
 *
 * | Form field     | DTO field  | Note |
 * |----------------|------------|------|
 * | `title`        | `title`    | Required, 1–255 chars. |
 * | `description`  | `description` | Optional, ≤ 2000 chars. |
 * | `slug`         | `slug`     | Optional, auto-derived if blank. |
 * | `requirements` | `requirements` | Optional, ≤ 5000 chars. |
 * | `imageUrl`     | `imageUrl` | Optional, ≤ 2048 chars. |
 * | `categoryId`   | `categoryId` | Optional UUID. |
 * | `tagSlugs`     | — (form-only, resolved to `tagIds` in submit handler) |
 * | `initialVersion` | `initialVersion` | Required, nested schema. |
 * | `acknowledgements` | — (form-only) | Confirm-rules checkbox. |
 *
 * ## Tag slugs → tag IDs
 *
 * `tagSlugs` holds validated slugs from the tag picker. The submit handler
 * resolves slugs → UUIDs via `useTagSlugsToIds` before calling
 * `createQuiz()`. The DTO field `tagIds` is NOT in this schema — it is
 * injected at submit time.
 *
 * ## Slug auto-derivation
 *
 * When `slug` is `null | undefined`, the backend auto-derives the slug from
 * `title`. The `QuizSlugField` component shows a live preview of the
 * derived slug beneath the input.
 *
 * ## Title constraint alignment
 *
 * The epic specifies 1–120 chars for title; the generated `CreateQuizDto`
 * specifies `@minLength 1 / @maxLength 255`. We align with the epic's
 * 120-char constraint for the Phase 4 form. If the backend's constraint
 * is confirmed to be 255, this should be updated to match.
 *
 * Source: `CreateQuizDto` + `CreateInitialQuizVersionDto` from
 *   `lib/api/generated/schemas/`.
 * Epic: `PHASE_4_EPICS.md` Story 4.8, Validation Rules.
 */
export const quizCreateFormSchema = z.object({
  title: z
    .string({ error: 'Title is required.' })
    .min(1, 'Title cannot be empty.')
    .max(120, 'Title cannot exceed 120 characters.'),
  description: z
    .string()
    .max(2000, 'Description cannot exceed 2000 characters.')
    .nullable()
    .optional(),
  slug: z
    .string()
    .max(120, 'Slug cannot exceed 120 characters.')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
      message: 'Slug must be lowercase alphanumeric with optional hyphens (e.g. `world-history`).',
    })
    .nullable()
    .optional(),
  requirements: z
    .string()
    .max(5000, 'Requirements cannot exceed 5000 characters.')
    .nullable()
    .optional(),
  imageUrl: z
    .string()
    .max(2048, 'Image URL cannot exceed 2048 characters.')
    .url('Image URL must be a valid URL.')
    .nullable()
    .optional(),
  isFeatured: z.boolean().nullable().optional(),
  isHidden: z.boolean().nullable().optional(),
  categoryId: z.string().uuid().nullable().optional(),
  /**
   * Form-only field. The user picks tags by slug; the submit handler
   * resolves slugs → UUIDs via `useTagSlugsToIds` before calling the
   * service. The DTO field is `tagIds`.
   * @maxItems 10
   */
  tagSlugs: z.array(tagSlugSchema).max(10, 'At most 10 tags per quiz.').default([]),
  initialVersion: initialQuizVersionFormSchema,
  // Form-only field; not in the DTO.
  acknowledgements: z.boolean().default(false).optional(),
});

// ────────────────────────────────────────────────────────────────────────
// 2. versionEditFormSchema — `PATCH /quizzes/:id/versions/:n` (story 4.9)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the version-edit authoring form (story 4.9).
 *
 * All fields are optional because `PATCH` is partial. The
 * `initialQuizVersionFormSchema` shapes are reused for the three
 * numeric / enum fields.
 */
export const versionEditFormSchema = z
  .object({
    difficulty: z.nativeEnum(CreateInitialQuizVersionDtoDifficulty).optional(),
    durationMs: z.number().int().min(1).optional(),
    passingScorePercent: z.number().int().min(0).max(100).optional(),
    rewardXp: z.number().int().min(0).optional(),
    changeNote: z
      .string()
      .max(500, 'Change note cannot exceed 500 characters.')
      .optional(),
  })
  .strict();

// ────────────────────────────────────────────────────────────────────────
// 3. questionFormSchema — `POST /quizzes/:id/versions/:n/questions`
//    (story 4.10, single row)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the per-question editor (story 4.10). Reuses
 * `quizQuestionFormSchema` as the body shape and adds the row's
 * stable `index` so the bulk editor can key the rendered atom rows.
 */
export const questionFormSchema = quizQuestionFormSchema.extend({
  /** Bulk-row index (form-only). */
  index: z.number().int().min(0).optional(),
});

// ────────────────────────────────────────────────────────────────────────
// 4. bulkQuestionsFormSchema — bulk-create wrapper (story 4.10)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the bulk-question authoring form. Wraps an array
 * of `questionFormSchema` rows. The consumer's submit handler is
 * responsible for slicing this into per-row `POST` calls (or a
 * single bulk `POST` when the backend exposes one).
 *
 * The array bounds (min 1, max 50) mirror the generated
 * `CreateQuizQuestionsDto`'s `@minItems` / `@maxItems`.
 */
export const bulkQuestionsFormSchema = z.object({
  items: z
    .array(questionFormSchema)
    .min(1, 'Add at least one question.')
    .max(50, 'At most 50 questions per bulk submit.'),
});

// ────────────────────────────────────────────────────────────────────────
// 5. reviewFormSchema — `POST /quizzes/:id/reviews` (story 4.13)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the review-submission form. Mirrors the generated
 * `CreateReviewDto` shape:
 *
 *   - `rating`: integer 1–5.
 *   - `comment`: string, trimmed, 1–2000 characters.
 *   - `idempotencyKey`: string, optional, used by the client to
 *     dedupe retries (the backend reads it from the header in some
 *     endpoints; the body field is documented for completeness).
 *
 * ## Comment length (Story 4.13 / T-4.13.3)
 *
 * The approved Story 4.13 contract is **1–2000** characters. The
 * generated `CreateReviewDto` currently ships `@maxLength 1000`,
 * which is a documented Story 4.13 / T-4.13.1 contract-drift item.
 * The form preset is locked to the approved 2000 cap; the next
 * backend regeneration is expected to widen the DTO to match.
 *
 * Empty or whitespace-only comments are rejected so the form never
 * sends a no-op body. The text is trimmed via `z.string().trim()`
 * before the length check so trailing whitespace cannot push a
 * 2000-character body past the limit.
 *
 * The form-only `acknowledgements` checkbox mirrors the quiz-create
 * preset.
 */
export const reviewFormSchema = z.object({
  rating: z
    .number({ error: 'Rating must be a number from 1 to 5.' })
    .int('Rating must be a whole number of stars.')
    .min(1, 'Rating must be at least 1 star.')
    .max(5, 'Rating cannot exceed 5 stars.'),
  comment: z
    .string({ error: 'Review text is required.' })
    .trim()
    .min(1, 'Review text cannot be empty.')
    .max(2000, 'Review cannot exceed 2000 characters.'),
  idempotencyKey: z.string().min(1).max(120).optional(),
});

// ────────────────────────────────────────────────────────────────────────
// 6. commentFormSchema — `POST /quizzes/:id/comments` (story 4.12)
// ────────────────────────────────────────────────────────────────────────

/**
 * Form schema for the comment-posting form. Mirrors the generated
 * `CreateCommentDto`:
 *
 *   - `body`: string, 1–2000 chars.
 *   - `parentCommentId`: UUID, nullable (omitted for top-level
 *     comments).
 *
 * The form-only `mentions?: string[]` field tracks @-mentions for
 * downstream notification (story 4.12 wiring; not in the DTO).
 */
export const commentFormSchema = z.object({
  body: z
    .string({ error: 'Comment text is required.' })
    .min(1, 'Comment cannot be empty.')
    .max(2000, 'Comment cannot exceed 2000 characters.'),
  parentCommentId: z.string().uuid().nullable().optional(),
  // Form-only.
  mentions: z.array(z.string().uuid()).max(20).default([]),
});

// ────────────────────────────────────────────────────────────────────────
// Inferred types — re-exported so consumers can `import type { … }`.
// ────────────────────────────────────────────────────────────────────────

export type QuizCreateFormValues = z.infer<typeof quizCreateFormSchema>;
export type VersionEditFormValues = z.infer<typeof versionEditFormSchema>;
export type QuestionFormValues = z.infer<typeof questionFormSchema>;
export type BulkQuestionsFormValues = z.infer<typeof bulkQuestionsFormSchema>;
export type ReviewFormValues = z.infer<typeof reviewFormSchema>;
export type CommentFormValues = z.infer<typeof commentFormSchema>;
export type InitialQuizVersionFormValues = z.infer<
  typeof initialQuizVersionFormSchema
>;
export type QuizAnswerOptionFormValues = z.infer<
  typeof quizAnswerOptionFormSchema
>;
export type QuizQuestionFormValues = z.infer<typeof quizQuestionFormSchema>;

// Re-export the question type so consumers can stay on a single import.
export type { QuestionType };

// ────────────────────────────────────────────────────────────────────────
// User schemas — profile + settings (TKT-4.3.A1).
// ────────────────────────────────────────────────────────────────────────

export {
  AT_LEAST_ONE_CHANNEL_MESSAGE,
  updateMyProfileSchema,
  updateMySettingsSchema,
} from './user-schemas';
export type {
  UpdateMyProfileFormValues,
  UpdateMySettingsFormValues,
} from './user-schemas';