/**
 * `lib/forms` — Phase 4 form-primitive public API.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2 (lines 202–293).
 *
 * The barrel mirrors the `@/lib/api` and `@/lib/feature-flags` convention:
 * consumers import the hook and types from `@/lib/forms`, never from the
 * implementation file directly.
 *
 * Exports are appended as each ticket lands in Batches A–F.
 */

// `useQuizForm` — typed Phase 4 form primitive (TKT-4.2.A1).
// The signature is the master-plan promise (story 4.2 line 206): a hook
// that owns `react-hook-form` + `zod` and exposes `submit()` /
// `bulkSubmit()`. The implementation lands across A1 → A4.
export {
  useQuizForm,
} from './useQuizForm';
export type {
  BulkError,
  UseQuizFormMode,
  UseQuizFormOptions,
  UseQuizFormReturn,
} from './useQuizForm';

// Tag-slug regex source (TKT-4.2.A5). Single byte-equal source of truth
// for `CreateQuizDto.slug`'s `@pattern` annotation. Consumed by
// `<TagMultiSelect />` and the `forms/presets/` schemas.
export {
  TAG_SLUG_REGEX,
  isValidTagSlug,
  tagSlugSchema,
  TAG_SLUG_INVALID_COPY,
} from './regex';
export type { TagSlug } from './regex';

// Minimal toast surface for the `<FormErrorBanner />`'s `toast: 'top'`
// placement (TKT-4.2.C1). The provider is mounted once at the app
// root; the hook returns a no-op context when unmounted.
export {
  ToastProvider,
  useToast,
  DEFAULT_TOAST_DURATION_MS,
} from './useToast';
export type {
  ToastContextValue,
  ToastEntry,
  ToastProviderProps,
  ToastViewportProps,
} from './useToast';

// Auto-save hook (TKT-4.2.C2). Persists form snapshots to localStorage
// every `intervalMs` (default 5_000) while the form is dirty; exposes
// `restore()` / `dismiss()` so `<DraftBanner />` can render the CTA.
export {
  useDraftAutoSave,
} from './useDraftAutoSave';
export type {
  DraftStorage,
  DraftSnapshot,
  UseDraftAutoSaveOptions,
  UseDraftAutoSaveReturn,
} from './useDraftAutoSave';

// Navigation-guard hook (TKT-4.2.C3). Installs the browser's
// `beforeunload` prompt + intercepts `popstate` events when the form
// has been dirty for longer than `thresholdMs` (default 5_000).
export {
  useUnsavedChangesGuard,
  DEFAULT_THRESHOLD_MS as DEFAULT_UNSAVED_CHANGES_THRESHOLD_MS,
} from './useUnsavedChangesGuard';
export type {
  UseUnsavedChangesGuardOptions,
  UseUnsavedChangesGuardReturn,
} from './useUnsavedChangesGuard';

// Form-schema presets (TKT-4.2.D1). Re-exported from
// `./presets` so consumers can `import { quizCreateFormSchema } from
// '@/lib/forms'`. The 6 presets cover the quiz-create, version-edit,
// question, bulk-question, review, and comment authoring surfaces.
export {
  // Schemas
  bulkQuestionsFormSchema,
  commentFormSchema,
  initialQuizVersionFormSchema,
  questionFormSchema,
  quizAnswerOptionFormSchema,
  quizCreateFormSchema,
  quizQuestionFormSchema,
  reviewFormSchema,
  versionEditFormSchema,
} from './presets';
export type {
  BulkQuestionsFormValues,
  CommentFormValues,
  InitialQuizVersionFormValues,
  QuestionFormValues,
  QuizAnswerOptionFormValues,
  QuizCreateFormValues,
  QuizQuestionFormValues,
  ReviewFormValues,
  VersionEditFormValues,
} from './presets';