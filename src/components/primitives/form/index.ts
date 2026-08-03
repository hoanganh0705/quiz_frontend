/**
 * Form-atom primitives barrel — Epic 4.2 / Batch B.
 *
 * Source epic:   Epic 4.2 — `useQuizForm` primitive + shared form atoms.
 * Source story:  PHASE_4_EPICS.md → Story 4.2.
 *
 * Each atom is a self-registering form input that pulls its value
 * from the surrounding `FormProvider` (created by `useQuizForm()`
 * from `@/lib/forms` / Batch A). Consumers never have to wire
 * `register()` manually — they mount the atoms inside a
 * `<FormProvider {...form}>` boundary.
 *
 * Exports are appended as each ticket lands:
 *   - TKT-4.2.B1 → TextField
 *   - TKT-4.2.B2 → RichTextArea
 *   - TKT-4.2.B3 → TagMultiSelect
 *   - TKT-4.2.B4 → DifficultySelect
 *   - TKT-4.2.B5 → QuestionTypeSelect
 *   - TKT-4.2.B6 → ImageUploadField
 *   - TKT-4.2.C1 → FormErrorBanner
 *   - TKT-4.2.C2 → DraftBanner
 *   - TKT-4.2.D2 → BulkErrorList
 */

export { TextField } from './TextField';
export type { TextFieldProps } from './TextField';

export { RichTextArea } from './RichTextArea';
export type { RichTextAreaProps } from './RichTextArea';

export { TagMultiSelect } from './TagMultiSelect';
export type { TagMultiSelectProps } from './TagMultiSelect';

export { DifficultySelect } from './DifficultySelect';
export type { DifficultySelectProps } from './DifficultySelect';

export { QuestionTypeSelect, QUESTION_TYPE_VALUES } from './QuestionTypeSelect';
export type { QuestionTypeSelectProps } from './QuestionTypeSelect';
export type { QuestionType } from './QuestionTypeSelect';

export { ImageUploadField } from './ImageUploadField';
export type { ImageUploadFieldProps } from './ImageUploadField';

// TKT-4.2.C1 — top-of-form error banner that consumes the typed
// `lastError` shape produced by `useQuizForm.submit()`.
export { FormErrorBanner } from './FormErrorBanner';
export type { FormErrorBannerProps } from './FormErrorBanner';

// TKT-4.2.C2 — restore-from-draft CTA banner. The banner is a pure
// presentation component; consumers pass `savedAt` + `restore` +
// `dismiss` (typically derived from `useDraftAutoSave`).
export { DraftBanner } from './DraftBanner';
export type { DraftBannerProps } from './DraftBanner';

// TKT-4.2.D2 — per-row bulk-error renderer that consumes
// `useQuizForm().bulkError` and exposes "Re-submit failed only" +
// "Dismiss" CTAs.
export { BulkErrorList } from './BulkErrorList';
export type { BulkErrorListProps } from './BulkErrorList';

// TKT-4.2.E1 — read-only banner that surfaces the master-plan
// "This quiz is no longer editable" copy. Rendered when the form
// is mounted with `mode: 'readonly'`.
export { ReadOnlyBanner } from './ReadOnlyBanner';
export type { ReadOnlyBannerProps } from './ReadOnlyBanner';