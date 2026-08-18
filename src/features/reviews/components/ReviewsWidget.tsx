'use client';

import { useMemo } from 'react';

import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { ReviewsList } from '@/features/reviews/components/ReviewsList';
import { useAuthSession } from '@/features/auth/hooks/use-auth-session';
import { useMyQuizReview } from '@/features/reviews/hooks/useMyQuizReview';

export interface ReviewsWidgetProps {

quizId: string;

onStartAttempt?: () => void;

startAttemptHref?: string;

className?: string;
}

export function ReviewsWidget({
quizId,
onStartAttempt,
startAttemptHref,
className,
}: ReviewsWidgetProps): React.ReactElement {
const { bootstrapState, currentUser } = useAuthSession();

const currentUserId = useMemo<string | null>(() => {
if (bootstrapState !== 'authenticated') return null;
if (!currentUser) return null;
const id = (currentUser as { id?: string; userId?: string }).id
?? (currentUser as { userId?: string }).userId;
return id ?? null;
  }, [bootstrapState, currentUser]);

const { review: myReview } = useMyQuizReview({ quizId });

const isAuthenticated = bootstrapState === 'authenticated';

return (
<section
className={className}
aria-label='Reviews section'
data-testid='reviews-widget'
data-quiz-id={quizId}
    >
<header className='mb-4'>
<h2 className='text-xl font-semibold'>Reviews</h2>
</header>

<div className='mb-6'>
{isAuthenticated ? (
<ReviewForm
quizId={quizId}
onStartAttempt={onStartAttempt}
startAttemptHref={startAttemptHref}
onCreateSuccess={() => {
              // The create flow's `invalidateReviewCaches` already
              // revalidates the list + gate; nothing else to do.
            }}
          />
        ) : null}
</div>

<ReviewsList
quizId={quizId}
currentUserId={currentUserId}
ownerReview={myReview}
      />
</section>
  );
}