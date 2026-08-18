'use client';

import { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { z } from 'zod';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { reviewFormSchema } from '@/lib/forms/presets';
import { StarRatingInput } from '@/features/reviews/components/StarRatingInput';
import { ReviewGateNotice } from '@/features/reviews/components/ReviewGateState';
import {
useReviewGate,
useCreateReview,
type UseReviewGateParams,
} from '@/features/reviews/hooks';

import { ReviewEditInline } from './ReviewEditInline';

export interface ReviewFormProps {
quizId: string;

onStartAttempt?: () => void;

startAttemptHref?: string;

onCreateSuccess?: () => void;
}

const MAX_COMMENT_LENGTH = 2000;
const SKELETON_COUNT = 5;

type LocalValidation = {
rating?: string;
comment?: string;
};

function validateLocally(
rating: number | null,
comment: string,
): { ok: true; values: { rating: number; comment: string } }
  | { ok: false; errors: LocalValidation } {
const parsed = reviewFormSchema.safeParse({ rating: rating ?? undefined, comment });
if (parsed.success) {
return {
ok: true,
values: {
rating: parsed.data.rating,
comment: parsed.data.comment,
      },
    };
  }
const errors: LocalValidation = {};
for (const issue of parsed.error.issues as z.core.$ZodIssue[]) {
const path = issue.path[0];
if (path === 'rating') errors.rating = issue.message;
if (path === 'comment') errors.comment = issue.message;
  }
return { ok: false, errors };
}

export function ReviewForm({
quizId,
onStartAttempt,
startAttemptHref,
onCreateSuccess,
}: ReviewFormProps) {
const gateParams: UseReviewGateParams = useMemo(
() => ({ quizId }),
[quizId],
  );
const { state, isLoading, revalidate } = useReviewGate(gateParams);

const [rating, setRating] = useState<number | null>(null);
const [comment, setComment] = useState<string>('');
const [localErrors, setLocalErrors] = useState<LocalValidation>({});

const {
submit,
isLoading: isSubmitting,
error: submitError,
lastOutcome,
reset: resetSubmit,
  } = useCreateReview(quizId, {
onSuccess: () => {

setRating(null);
setComment('');
setLocalErrors({});
resetSubmit();
onCreateSuccess?.();
    },
  });

const handleSubmit = useCallback(async () => {
const trimmed = comment.trim();
if (state.kind !== 'eligible') {

return;
    }
const result = validateLocally(rating, trimmed);
if (!result.ok) {
setLocalErrors(result.errors);
return;
    }
setLocalErrors({});
const ok = await submit({ rating: result.values.rating, comment: result.values.comment });

void ok;
  }, [comment, rating, state.kind, submit]);

const gateOverriddenByOutcome =
lastOutcome?.kind === 'attempt-required' ||
lastOutcome?.kind === 'conflict';

if (gateOverriddenByOutcome) {
if (lastOutcome?.kind === 'conflict') {

return <ReviewFormConflictNotice />;
    }
return (
<ReviewGateNotice
onStartAttempt={onStartAttempt}
startAttemptHref={startAttemptHref}
      />
    );
  }

if (state.kind !== 'eligible') {
if (isLoading && state.kind === 'loading') {
return <ReviewFormSkeleton />;
    }
if (state.kind === 'existing-review') {
return <ReviewEditInline review={state.review} onDeleted={revalidate} />;
    }
if (state.kind === 'attempt-required') {
return (
<ReviewGateNotice
onStartAttempt={onStartAttempt}
startAttemptHref={startAttemptHref}
        />
      );
    }
if (state.kind === 'unauthenticated') {
return (
<ReviewFormSignInPrompt
startAttemptHref={startAttemptHref}
        />
      );
    }
if (state.kind === 'error') {
return <ReviewFormErrorBanner onRetry={() => void revalidate()} />;
    }
  }

const trimmedComment = comment.trim();
const commentErrorFrom422 =
submitError && isApiError(submitError) && submitError.code === 'REVIEW_VALIDATION'
?

'Please check the highlighted fields.'
: null;
const revertedErrorMessage = lastOutcome?.kind === 'reverted'
? getUserCopy('GLOBAL_UNKNOWN')
: null;

return (
<form
className='flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-xs'
data-testid='review-form'
onSubmit={(e) => {
e.preventDefault();
void handleSubmit();
      }}
    >
<label className='text-sm font-medium' htmlFor='review-form-rating'>
Your rating
      </label>
<div
id='review-form-rating'
data-testid='review-form-rating'
aria-invalid={localErrors.rating ? true : undefined}
      >
<StarRatingInput
value={rating}
onValueChange={(next) => {
setRating(next);
if (localErrors.rating) {
setLocalErrors((prev) => ({ ...prev, rating: undefined }));
            }
          }}
ariaLabel='Rate this quiz'
        />
</div>
{localErrors.rating && (
<p
role='alert'
data-testid='review-form-rating-error'
className='text-xs text-destructive'
        >
{localErrors.rating}
</p>
      )}

<label className='mt-1 text-sm font-medium' htmlFor='review-form-comment'>
Your review
      </label>
<Textarea
id='review-form-comment'
data-testid='review-form-comment'
value={comment}
onChange={(e) => {
setComment(e.currentTarget.value);
if (localErrors.comment) {
setLocalErrors((prev) => ({ ...prev, comment: undefined }));
          }
if (submitError) resetSubmit();
        }}
rows={4}
placeholder={`Share what you liked and what could be better (1-${MAX_COMMENT_LENGTH} characters).`}
maxLength={MAX_COMMENT_LENGTH}
aria-invalid={localErrors.comment || commentErrorFrom422 ? true : undefined}
disabled={isSubmitting}
      />
<div className='flex items-center justify-between text-xs tabular-nums'>
<span
className={cn(
trimmedComment.length === 0 ? 'text-destructive' : 'text-muted-foreground',
trimmedComment.length > MAX_COMMENT_LENGTH && 'text-destructive',
          )}
aria-live='polite'
        >
{trimmedComment.length} / {MAX_COMMENT_LENGTH}
</span>
{(localErrors.comment || commentErrorFrom422) && (
<span
role='alert'
data-testid='review-form-comment-error'
className='text-destructive'
          >
{localErrors.comment ?? commentErrorFrom422}
</span>
        )}
{revertedErrorMessage && (
<span
role='alert'
data-testid='review-form-submit-error'
className='ml-2 text-destructive'
          >
{revertedErrorMessage.title}
</span>
        )}
</div>

<div className='flex justify-end gap-2 pt-1'>
<Button
type='submit'
size='sm'
disabled={
isSubmitting ||
rating === null ||
trimmedComment.length === 0 ||
trimmedComment.length > MAX_COMMENT_LENGTH
          }
aria-busy={isSubmitting || undefined}
data-testid='review-form-submit'
        >
{isSubmitting && (
<Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />
          )}
Post review
        </Button>
</div>
</form>
  );
}

function ReviewFormSkeleton() {
return (
<div
className='flex flex-col gap-3 rounded-lg border bg-card/60 p-4 shadow-xs'
data-testid='review-form-skeleton'
aria-busy
aria-live='polite'
    >
{Array.from({ length: SKELETON_COUNT }, (_, idx) => (
<div
key={idx}
className='h-4 w-full animate-pulse rounded-sm bg-muted motion-reduce:animate-none'
        />
      ))}
</div>
  );
}

function ReviewFormSignInPrompt({
startAttemptHref,
}: {
startAttemptHref?: string;
}) {
return (
<div
className='flex flex-col gap-2 rounded-lg border bg-card p-4 text-sm shadow-xs'
data-testid='review-form-signin'
role='status'
    >
<p className='font-medium text-foreground'>Sign in to write a review</p>
<p className='text-muted-foreground'>
You need to be signed in to post a review for this quiz.
      </p>
{startAttemptHref ? (
<a
href={startAttemptHref}
className='text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm'
data-testid='review-form-signin-cta'
        >
Sign in
        </a>
      ) : null}
</div>
  );
}

function ReviewFormErrorBanner({ onRetry }: { onRetry: () => void }) {
return (
<div
role='alert'
className='flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive'
data-testid='review-form-error'
    >
<AlertTriangle className='mt-0.5 shrink-0' size={18} aria-hidden />
<div className='flex-1'>
<p className='font-medium'>We couldn&apos;t load your review eligibility.</p>
<p className='text-xs'>Please try again in a moment.</p>
</div>
<Button
type='button'
size='sm'
variant='outline'
onClick={onRetry}
data-testid='review-form-retry'
      >
Retry
      </Button>
</div>
  );
}

function ReviewFormConflictNotice(): React.ReactElement {

return (
<div
role='status'
data-testid='review-form-conflict'
className='rounded-lg border bg-card p-4 text-sm shadow-xs'
    >
<p className='font-medium text-foreground'>You already have a review for this quiz.</p>
<p className='mt-1 text-xs text-muted-foreground'>
Reloading your existing review…
      </p>
</div>
  );
}
