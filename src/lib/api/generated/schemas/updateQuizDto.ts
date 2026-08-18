/**
 * TODO: Hand-edited — regenerate via `pnpm orval` once the backend is
 * running with the Phase 3/4 decorators present.
 *
 * Migration scope (Phase 5/6): the legacy `imageUrl` field is
 * removed; `imagePublicId` is the new source of truth for the quiz
 * cover image. The backend's `QuizApplicationService.updateQuiz`
 * rejects cross-user `imagePublicId` values with 403
 * `ASSET_NOT_OWNED`.
 */

export interface UpdateQuizDto {
  title?: string;
  description?: string | null;
  slug?: string | null;
  requirements?: string | null;
  imagePublicId?: string | null;
  isFeatured?: boolean | null;
  isHidden?: boolean | null;
  categoryId?: string | null;
  tagIds?: string[] | null;
}
