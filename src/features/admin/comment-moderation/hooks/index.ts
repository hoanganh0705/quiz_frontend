/**
 * Public barrel for the comment-moderation hooks.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source ticket: TKT-7.6.C1–C4.
 *
 * Consumers import from this module rather than reaching into the
 * individual hook files. The barrel is the single source of truth
 * for which hooks are part of the queue's public surface; future
 * refactors route imports through here.
 */

export {
  useCommentReports,
  commentReportsKey,
  commentReportsKeyMatcher,
  isCommentReportsShow,
  normalizeCommentReportsShow,
  DEFAULT_COMMENT_REPORTS_SHOW,
  COMMENT_REPORTS_SHOW_VALUES,
  type UseCommentReportsResult,
  type UseCommentReportsParams,
  type CommentReportsShow,
} from './useCommentReports';

export {
  useResolveCommentReport,
  type UseResolveCommentReportResult,
  type ResolveOptions,
  type ResolveAuditSnapshot,
  type ResolveOutcome,
} from './useResolveCommentReport';

export {
  useHideComment,
  useRestoreComment,
  type UseHideCommentResult,
  type UseRestoreCommentResult,
  type HideCommentOutcome,
  type RestoreCommentOutcome,
  type CommentVisibilityOptions,
} from './useHideComment';

export {
  useComment,
  commentIdKeyMatcher,
  type UseCommentResult,
  type UseCommentParams,
} from './useComment';

export {
  commentIdKey,
  commentThreadKey,
  commentIdKeyMatcher as commentIdKeyMatcherExplicit,
  commentsNamespaceKeyMatcher,
} from './commentIdKeys';
