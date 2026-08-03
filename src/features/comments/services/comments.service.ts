/**
 * `comments.service.ts` — Phase 4 comment write-path service.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source ticket: TKT-4.1.F4.
 *
 * The single import surface for every Phase 4 comment mutation
 * consumed by story 4.13 / discussion surfaces.
 *
 * ## SDK placement (TKT-4.1.A1 drift)
 *
 * Comment CRUD + vote + report live across **two** SDK builders:
 *
 *   - `getComments()` — the comments tag builder. The backend
 *     controller is `CommentController` (singular), so orval strips
 *     the redundant prefix: `getComment`, `editComment`,
 *     `castVote`, `removeVote`, `reportComment`, `hideComment`,
 *     `restoreComment`, `listReports`, `reviewReport`, `deleteComment`.
 *
 *   - `getQuizzes().listQuizComments` / `createComment` — the
 *     quiz-scoped comment list + create (the backend exposes these
 *     on the quizzes tag because they're nested under a quiz route).
 *
 * This service unifies both behind the planning-intent names from
 * master plan lines 305–308 so the drift is invisible to feature
 * hooks.
 *
 * ## Code exposure
 *
 * Per the cross-story contract rule, the comment mutations may surface:
 *
 *   - `COMMENT_SELF_VOTE` (400)        — voting on own comment
 *   - `COMMENT_SELF_REPORT` (400)      — reporting own comment
 *   - `COMMENT_REPLY_LIMIT_EXCEEDED`   — max nesting / reply depth
 *   - `COMMENT_DUPLICATE_REPORT`       — already reported by user
 *
 * These surface through the `ApiError.code` thrown from the service.
 *
 * @see useOptimisticMutation (TKT-4.1.E1) — canonical mutation primitive.
 * @see error-codes.ts (TKT-4.1.C1) — `USER_COPY` lookup via `getUserCopy(apiError.code)`.
 */

import { getComments, getQuizzes } from '@/lib/api';

import type {
  CreateCommentDto,
  EditCommentDto,
  VoteDto,
  ReportCommentDto,
  ReviewReportDto,
} from '@/lib/api/generated/schemas';

export type {
  GetCommentResult,
  EditCommentResult,
  CastVoteResult,
  RemoveVoteResult,
  ReportCommentResult,
  HideCommentResult,
  RestoreCommentResult,
  ListReportsResult,
  ReviewReportResult,
} from '@/lib/api/generated/comments/comments';

export type {
  ListQuizCommentsResult,
  CreateCommentResult,
} from '@/lib/api/generated/quizzes/quizzes';

export interface ListCommentsParams {
  cursor?: string;
  limit?: number;
}

// ─── Quiz-scoped list / create (quizzes tag) ────────────────────────────

export async function listQuizComments(
  quizId: string,
  params?: ListCommentsParams,
) {
  const sdk = getQuizzes();
  return sdk.listQuizComments(quizId, params);
}

export async function createComment(
  quizId: string,
  payload: CreateCommentDto,
) {
  const sdk = getQuizzes();
  return sdk.createComment(quizId, payload);
}

// ─── Single-comment operations (comments tag) ──────────────────────────

export async function getComment(commentId: string) {
  const sdk = getComments();
  return sdk.getComment(commentId);
}

export async function editComment(commentId: string, payload: EditCommentDto) {
  const sdk = getComments();
  return sdk.editComment(commentId, payload);
}

export async function deleteComment(commentId: string) {
  const sdk = getComments();
  return sdk.deleteComment(commentId);
}

// ─── Vote (comments tag — PUT is idempotent per the JSDoc) ──────────────

export async function voteComment(commentId: string, payload: VoteDto) {
  const sdk = getComments();
  return sdk.castVote(commentId, payload);
}

export async function unvoteComment(commentId: string) {
  const sdk = getComments();
  return sdk.removeVote(commentId);
}

// ─── Report (comments tag) ─────────────────────────────────────────────

export async function reportComment(
  commentId: string,
  payload: ReportCommentDto,
) {
  const sdk = getComments();
  return sdk.reportComment(commentId, payload);
}

// ─── Mod-only (comments tag) — exposed for story 4.13 mod flows ───────

export async function hideComment(commentId: string) {
  const sdk = getComments();
  return sdk.hideComment(commentId);
}

export async function restoreComment(commentId: string) {
  const sdk = getComments();
  return sdk.restoreComment(commentId);
}

export async function listReports(params?: ListCommentsParams) {
  const sdk = getComments();
  return sdk.listReports(params);
}

export async function reviewReport(
  reportId: string,
  payload: ReviewReportDto,
) {
  const sdk = getComments();
  return sdk.reviewReport(reportId, payload);
}