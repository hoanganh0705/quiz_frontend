/**
 * Public barrel for the comment-moderation components.
 *
 * Source epic:   Epic 7.6 — Comment Moderation (Hide, Restore, and Report Queue).
 * Source tickets: TKT-7.6.D1–D4 (initial surface),
 *   TKT-7.6.E1–E3 (row, panel, list), TKT-7.6.F1 (page).
 *
 * Consumers import from this module rather than reaching into the
 * individual component files. The barrel is the single source of
 * truth for which components are part of the queue's public surface.
 */

export {
  CommentReportActionMenu,
  type CommentReportActionMenuProps,
} from './CommentReportActionMenu';

export {
  CommentReportActionConfirmDialog,
  type CommentReportActionConfirmDialogProps,
} from './CommentReportActionConfirmDialog';

export {
  HideCommentDialog,
  RestoreCommentDialog,
  type HideCommentDialogProps,
  type RestoreCommentDialogProps,
} from './CommentVisibilityDialogs';

export {
  CommentReportSkeleton,
  CommentReportEmptyState,
  CommentReportErrorState,
  CommentHiddenState,
  type CommentReportSkeletonProps,
  type CommentReportEmptyStateProps,
  type CommentReportErrorStateProps,
  type CommentHiddenStateProps,
} from './CommentReportStates';

export {
  CommentReportItem,
  type CommentReportItemProps,
  type CommentRowStatus,
} from './CommentReportItem';

export {
  CommentReportDetailPanel,
  type CommentReportDetailPanelProps,
} from './CommentReportDetailPanel';

export {
  CommentReportsList,
  type CommentReportsListProps,
} from './CommentReportsList';

export {
  CommentReportsPage,
  type CommentReportsPageProps,
} from './CommentReportsPage';