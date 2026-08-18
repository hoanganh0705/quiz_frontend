'use client';

import { useEffect, useRef, useState } from 'react';
import { Loader2, Pencil, Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { Textarea } from '@/components/ui/Textarea';
import {
AlertDialog,
AlertDialogAction,
AlertDialogCancel,
AlertDialogContent,
AlertDialogDescription,
AlertDialogFooter,
AlertDialogHeader,
AlertDialogTitle,
} from '@/components/ui/AlertDialog';
import { Input } from '@/components/ui/Input';
import { cn } from '@/shared/utils/merge-class-names';
import { isApiError } from '@/lib/api';
import { getUserCopy } from '@/lib/api/error-codes';

import { StarRatingInput } from '@/features/reviews/components/StarRatingInput';
import { useEditReview } from '@/features/reviews/hooks/useEditReview';
import { useDeleteReview } from '@/features/reviews/hooks/useDeleteReview';
import type { MyReviewDto } from '@/features/reviews/types';
import { reviewFormSchema } from '@/lib/forms/presets';

export interface ReviewEditInlineProps {
review: MyReviewDto;

onDeleted?: () => void;
className?: string;
}

const MAX_COMMENT_LENGTH = 2000;

const DELETE_TYPED_STRING = 'delete';

export function ReviewEditInline({
review,
onDeleted,
className,
}: ReviewEditInlineProps): React.ReactElement | null {
const reviewId = review.reviewId;
const initialRating = review.rating;
const initialComment = review.comment ?? '';

const [editing, setEditing] = useState(false);
const [confirmOpen, setConfirmOpen] = useState(false);
const [draftRating, setDraftRating] = useState<number>(initialRating);
const [draftComment, setDraftComment] = useState<string>(initialComment);
const [fieldErrors, setFieldErrors] = useState<{
rating?: string;
comment?: string;
  }>({});

const seenRef = useRef({ rating: initialRating, comment: initialComment });

const {
update,
isLoading: isUpdating,
error: editError,
lastOutcome: editOutcome,
reset: resetEdit,
  } = useEditReview(reviewId);

const {
remove,
isLoading: isDeleting,
error: deleteError,
lastOutcome: deleteOutcome,
reset: resetDelete,
  } = useDeleteReview(reviewId);

useEffect(() => {
const seen = seenRef.current;
if (
seen.rating !== initialRating ||
seen.comment !== (initialComment ?? '')
    ) {
seenRef.current = { rating: initialRating, comment: initialComment ?? '' };
if (!editing) {
setDraftRating(initialRating);
setDraftComment(initialComment ?? '');
      }
    }
  }, [initialRating, initialComment, editing]);

useEffect(() => {
if (
editOutcome?.kind === 'stale' ||
editOutcome?.kind === 'forbidden'
    ) {
setEditing(false);
    }
  }, [editOutcome]);

useEffect(() => {
if (
deleteOutcome?.kind === 'success' ||
deleteOutcome?.kind === 'not-found'
    ) {
setConfirmOpen(false);
onDeleted?.();
    }
  }, [deleteOutcome, onDeleted]);

if (!editing) {
const trimmedDraft = draftComment.trim();
const editValid =
draftRating >= 1 &&
draftRating <= 5 &&
trimmedDraft.length >= 1 &&
trimmedDraft.length <= MAX_COMMENT_LENGTH &&
(draftRating !== initialRating || trimmedDraft !== initialComment);

const handleSave = async () => {
const parsed = reviewFormSchema.safeParse({
rating: draftRating,
comment: trimmedDraft,
      });
if (!parsed.success) {
const errs: { rating?: string; comment?: string } = {};
for (const issue of parsed.error.issues) {
const p = issue.path[0];
if (p === 'rating') errs.rating = issue.message;
if (p === 'comment') errs.comment = issue.message;
        }
setFieldErrors(errs);
return;
      }
setFieldErrors({});
const ok = await update({
rating: parsed.data.rating,
comment: parsed.data.comment,
      });
if (ok) {
setEditing(false);
      }
    };

const editErrorCopy =
editError && isApiError(editError)
? getUserCopy(editError.code)
: null;
const deleteErrorCopy =
deleteError && isApiError(deleteError)
? getUserCopy(deleteError.code)
: null;

return (
<>
<div
className={cn('flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs', className)}
data-testid={`review-edit-inline-${reviewId}`}
        >
<div className='flex items-start justify-between gap-2'>
<div className='flex flex-col gap-1'>
<p className='text-sm font-medium text-foreground'>Your review</p>
<StarRatingInput
value={draftRating}
onValueChange={setDraftRating}
ariaLabel='Your rating'
              />
</div>
<div className='flex gap-1'>
<Button
type='button'
variant='ghost'
size='icon'
aria-label='Edit review'
onClick={() => {
setDraftRating(initialRating);
setDraftComment(initialComment ?? '');
setFieldErrors({});
resetEdit();
setEditing(true);
                }}
data-testid={`review-edit-open-${reviewId}`}
              >
<Pencil size={16} aria-hidden />
</Button>
<Button
type='button'
variant='ghost'
size='icon'
aria-label='Delete review'
onClick={() => {
resetDelete();
setConfirmOpen(true);
                }}
data-testid={`review-delete-open-${reviewId}`}
              >
<Trash2 size={16} aria-hidden />
</Button>
</div>
</div>
<Textarea
value={draftComment}
readOnly
rows={3}
className='bg-muted/40'
aria-label='Your review text'
data-testid={`review-edit-inline-body-${reviewId}`}
          />
<div className='flex items-center justify-between text-xs tabular-nums text-muted-foreground'>
<span>{trimmedDraft.length} / {MAX_COMMENT_LENGTH}</span>
</div>
{fieldErrors.rating && (
<p
role='alert'
data-testid={`review-edit-inline-rating-error-${reviewId}`}
className='text-xs text-destructive'
            >
{fieldErrors.rating}
</p>
          )}
{fieldErrors.comment && (
<p
role='alert'
data-testid={`review-edit-inline-comment-error-${reviewId}`}
className='text-xs text-destructive'
            >
{fieldErrors.comment}
</p>
          )}
{editErrorCopy && (
<p
role='alert'
data-testid={`review-edit-inline-error-${reviewId}`}
className='text-xs text-destructive'
            >
{editErrorCopy.title}: {editErrorCopy.body}
</p>
          )}
{deleteErrorCopy && (
<p
role='alert'
data-testid={`review-edit-inline-delete-error-${reviewId}`}
className='text-xs text-destructive'
            >
{deleteErrorCopy.title}: {deleteErrorCopy.body}
</p>
          )}
</div>

<ReviewDeleteConfirmDialog
open={confirmOpen}
onConfirm={async () => {
await remove();
          }}
onCancel={() => setConfirmOpen(false)}
loading={isDeleting}
testId={`review-delete-confirm-${reviewId}`}
        />
{/* Hidden helper used in tests to ensure the inline body
            row has its stable id, even though the UI shows a
            read-only display. */}
<span className='sr-only' data-testid={`review-edit-inline-validity-${reviewId}`} data-valid={editValid}>
{editValid ? 'edits' : 'no-edits'}
</span>
</>
    );
  }

const trimmed = draftComment.trim();
const tooLong = trimmed.length > MAX_COMMENT_LENGTH;
const empty = trimmed.length === 0;

const handleEditSave = async () => {
const parsed = reviewFormSchema.safeParse({
rating: draftRating,
comment: trimmed,
    });
if (!parsed.success) {
const errs: { rating?: string; comment?: string } = {};
for (const issue of parsed.error.issues) {
const p = issue.path[0];
if (p === 'rating') errs.rating = issue.message;
if (p === 'comment') errs.comment = issue.message;
      }
setFieldErrors(errs);
return;
    }
setFieldErrors({});
const ok = await update({
rating: parsed.data.rating,
comment: parsed.data.comment,
    });
if (ok) {
setEditing(false);
    }
  };

const editErrorCopy =
editError && isApiError(editError)
? getUserCopy(editError.code)
: null;

return (
<div
className={cn('flex flex-col gap-2 rounded-lg border bg-card p-4 shadow-xs', className)}
data-testid={`review-edit-inline-editing-${reviewId}`}
    >
<StarRatingInput
value={draftRating}
onValueChange={(next) => {
setDraftRating(next);
if (fieldErrors.rating) {
setFieldErrors((prev) => ({ ...prev, rating: undefined }));
          }
        }}
ariaLabel='Edit your rating'
      />
{fieldErrors.rating && (
<p
role='alert'
data-testid={`review-edit-inline-rating-error-${reviewId}`}
className='text-xs text-destructive'
        >
{fieldErrors.rating}
</p>
      )}
<Textarea
value={draftComment}
onChange={(e) => {
setDraftComment(e.currentTarget.value);
if (fieldErrors.comment) {
setFieldErrors((prev) => ({ ...prev, comment: undefined }));
          }
if (editError) resetEdit();
        }}
rows={4}
maxLength={MAX_COMMENT_LENGTH}
disabled={isUpdating}
data-testid={`review-edit-inline-body-${reviewId}`}
      />
<div className='flex items-center justify-between text-xs tabular-nums'>
<span
className={cn(
'text-muted-foreground',
(tooLong || empty) && 'text-destructive',
          )}
aria-live='polite'
        >
{trimmed.length} / {MAX_COMMENT_LENGTH}
</span>
{editErrorCopy && (
<span
role='alert'
data-testid={`review-edit-inline-error-${reviewId}`}
className='text-destructive'
          >
{editErrorCopy.title}
</span>
        )}
</div>
{fieldErrors.comment && (
<p
role='alert'
data-testid={`review-edit-inline-comment-error-${reviewId}`}
className='text-xs text-destructive'
        >
{fieldErrors.comment}
</p>
      )}
<div className='flex justify-end gap-2'>
<Button
type='button'
variant='outline'
size='sm'
onClick={() => {
setEditing(false);
setDraftRating(initialRating);
setDraftComment(initialComment ?? '');
setFieldErrors({});
          }}
disabled={isUpdating}
data-testid={`review-edit-inline-cancel-${reviewId}`}
        >
Cancel
        </Button>
<Button
type='button'
size='sm'
disabled={
isUpdating ||
empty ||
tooLong ||
(draftRating === initialRating && trimmed === initialComment)
          }
aria-busy={isUpdating || undefined}
onClick={() => {
void handleEditSave();
          }}
data-testid={`review-edit-inline-save-${reviewId}`}
        >
{isUpdating && <Loader2 className='mr-2 animate-spin motion-reduce:animate-none' size={14} aria-hidden />}
Save
        </Button>
</div>
</div>
  );
}

interface ReviewDeleteConfirmDialogProps {
open: boolean;
onConfirm: () => void;
onCancel: () => void;
loading: boolean;
testId: string;
}

function ReviewDeleteConfirmDialog({
open,
onConfirm,
onCancel,
loading,
testId,
}: ReviewDeleteConfirmDialogProps): React.ReactElement {
const [typed, setTyped] = useState('');
const confirmedRef = useRef(false);
const matches = typed.trim() === DELETE_TYPED_STRING;

useEffect(() => {
if (!open) {

setTyped('');
confirmedRef.current = false;
    }
  }, [open]);

const handleConfirm = () => {
if (!matches || loading) return;
confirmedRef.current = true;
onConfirm();
  };

return (
<AlertDialog
open={open}
onOpenChange={(next) => {
if (next) return;
if (!confirmedRef.current) onCancel();
      }}
    >
<AlertDialogContent className='sm:max-w-md' data-testid={testId}>
<AlertDialogHeader>
<AlertDialogTitle data-testid={`${testId}-title`}>
Delete your review?
          </AlertDialogTitle>
<AlertDialogDescription data-testid={`${testId}-body`}>
This will remove your rating and helpful counts associated with it.
          </AlertDialogDescription>
</AlertDialogHeader>
<div className='flex flex-col gap-2'>
<label
htmlFor={`${testId}-typed-input`}
className='text-sm font-medium'
          >
Type <span className='font-mono'>{DELETE_TYPED_STRING}</span> to confirm
          </label>
<Input
id={`${testId}-typed-input`}
data-testid={`${testId}-typed-input`}
value={typed}
onChange={(e) => setTyped(e.currentTarget.value)}
onKeyDown={(e) => {
if (e.key === 'Enter' && matches && !loading) {
e.preventDefault();
handleConfirm();
              }
            }}
autoComplete='off'
spellCheck={false}
autoFocus
disabled={loading}
          />
</div>
<AlertDialogFooter>
<AlertDialogCancel data-testid={`${testId}-cancel`} disabled={loading}>
Cancel
          </AlertDialogCancel>
<AlertDialogAction asChild>
<Button
type='button'
disabled={!matches || loading}
aria-busy={loading || undefined}
onClick={(e) => {
if (!matches || loading) {
e.preventDefault();
return;
                }
handleConfirm();
              }}
data-testid={`${testId}-confirm`}
            >
Delete
            </Button>
</AlertDialogAction>
</AlertDialogFooter>
</AlertDialogContent>
</AlertDialog>
  );
}