/**
 * Barrel for `features/admin/review-moderation/hooks`.
 *
 * Source epic:   Epic 7.5.
 *
 * Consumers import hook surface from this module — never from
 * individual hook files — so refactors (renames, internal splits)
 * stay source-compatible.
 */

export {
  useReviewReports,
  DEFAULT_REVIEW_REPORTS_SHOW,
  REVIEW_REPORTS_SHOW_VALUES,
  reviewReportsKey,
  reviewReportsKeyMatcher,
  isReviewReportsShow,
  normalizeReviewReportsShow,
  type ReviewReportsShow,
  type UseReviewReportsParams,
  type UseReviewReportsResult,
  type UseReviewReportsFetcherParams,
} from './useReviewReports';

export {
  useResolveReviewReport,
  type ResolveOptions,
  type ResolveOutcome,
  type ResolveAuditSnapshot,
  type UseResolveReviewReportResult,
} from './useResolveReviewReport';

export {
  useReview,
  REVIEW_READ_KEY,
  type UseReviewResult,
} from './useReview';
