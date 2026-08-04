// Reviews feature - public API surface
export * from './services';
export * from './types';

// Hooks — explicit named exports.
export {
  useQuizReviews,
  useMyQuizReview,
  useCompletedQuizAttempt,
  useReviewGate,
  useCreateReview,
  useEditReview,
  useDeleteReview,
  useHelpfulReview,
} from './hooks';
export type {
  UseQuizReviewsParams,
  UseQuizReviewsResult,
  UseMyQuizReviewParams,
  UseMyQuizReviewResult,
  UseCompletedQuizAttemptParams,
  UseCompletedQuizAttemptResult,
  UseReviewGateParams,
  CreateReviewOutcome,
  CreateReviewOutcomeKind,
  UseCreateReviewOptions,
  UseCreateReviewResult,
  EditReviewOutcome,
  EditReviewOutcomeKind,
  UseEditReviewOptions,
  UseEditReviewResult,
  DeleteReviewOutcome,
  DeleteReviewOutcomeKind,
  UseDeleteReviewOptions,
  UseDeleteReviewResult,
  UseHelpfulReviewParams,
  UseHelpfulReviewResult,
} from './hooks';

// Components — the presentational `ReviewGateNotice` is the
// public name; the file name remains `ReviewGateState.tsx` to
// match the ticket naming, but the symbol is re-exported as
// `ReviewGateNotice` so the feature barrel does not collide
// with the `ReviewGateState` type union (from `./types`).
export {
  StarRatingInput,
  ReviewHelpfulButton,
  ReviewGateNotice,
  ReviewForm,
  ReviewEditInline,
  ReviewItem,
  ReviewItemSkeleton,
  ReviewsList,
  ReviewsWidget,
} from './components';
export type {
  StarRatingInputProps,
  ReviewGateStateProps,
  ReviewHelpfulButtonProps,
  ReviewFormProps,
  ReviewEditInlineProps,
  ReviewsListProps,
  ReviewsWidgetProps,
} from './components';
