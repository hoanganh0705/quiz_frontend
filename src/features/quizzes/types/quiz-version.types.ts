/**
 * Quiz Version Types — Epic 4.9
 *
 * Type aliases for the edit page DTOs, aligned with the generated SDK schemas.
 *
 * Source epic:   Epic 4.9 — Quiz version lifecycle + edit version metadata.
 * Source ticket: TKT-4.9 types (shared across all B-1 hooks).
 *
 * ## DTO mappings
 *
 * | API response              | Type alias                    | Notes                          |
 * |---------------------------|-------------------------------|--------------------------------|
 * | GET /quizzes/:id          | `QuizAuthorView`             | Author view of quiz + versions |
 * | GET /quizzes/:id/versions | `QuizVersionListResponse`    | Paginated list                 |
 * | GET /quizzes/:id/versions/:versionId | `QuizVersionDetail` | Single version with questions |
 *
 * ## SWR key factory
 *
 * `quizAuthorKey(quizId)` and `quizVersionKey(quizId, versionId)` are the
 * single sources of truth for SWR cache keys in Epic 4.9.
 */

import type {
  QuizVersionResponseDto,
  QuizVersionDetailResponseDto,
  CreateQuizVersionDto,
  UpdateQuizVersionDto,
} from '@/lib/api/generated/schemas';

// ─── SWR Key Factories ─────────────────────────────────────────────────────────

/** SWR key for the quiz author view. */
export function quizAuthorKey(quizId: string): ['quiz', 'author', string] {
  return ['quiz', 'author', quizId];
}

/** SWR key for the quiz version list. */
export function quizVersionsKey(quizId: string): ['quiz', 'versions', string] {
  return ['quiz', 'versions', quizId];
}

/** SWR key for a single quiz version. */
export function quizVersionKey(
  quizId: string,
  versionId: string,
): ['quiz', 'version', string, string] {
  return ['quiz', 'version', quizId, versionId];
}

// ─── Type Aliases ─────────────────────────────────────────────────────────────

/**
 * `QuizVersionResponseDto` — list item shape for version listing.
 * Includes: quizVersionId, quizId, versionNumber, status, difficulty,
 * durationMs, passingScorePercent, rewardXp, creatorId, createdAt,
 * publishedAt, archivedAt, updatedAt, questions (optional).
 *
 * We extend it with `id` alias for cursor pagination compatibility.
 */
export type QuizVersionSummary = QuizVersionResponseDto & { id: string };

/**
 * `QuizVersionDetailResponseDto` — full version detail including questions.
 * Author view — includes `isCorrect` on answer options.
 */
export type QuizVersionDetail = QuizVersionDetailResponseDto;

/**
 * Quiz author view — the shape returned by `GET /quizzes/:id` for the author.
 * This combines quiz metadata with version list for the edit page.
 */
export interface QuizAuthorView {
  /** Unique quiz identifier */
  quizId: string;
  /** Quiz title */
  title: string;
  /** Quiz description */
  description: string | null;
  /** URL-friendly slug */
  slug: string;
  /** Creator user identifier */
  creatorId: string | null;
  /** Quiz cover image URL */
  imageUrl: string | null;
  /** Associated category identifier */
  categoryId: string | null;
  /** Whether the quiz is hidden */
  isHidden: boolean;
  /** Currently published version identifier */
  publishedVersionId: string | null;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
}

// ─── Form DTOs ────────────────────────────────────────────────────────────────

export type { CreateQuizVersionDto, UpdateQuizVersionDto };
