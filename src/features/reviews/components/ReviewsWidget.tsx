'use client';

/**
 * `ReviewsWidget` — Story 4.13 widget composing the gated authoring
 * surface and the public list.
 *
 * Source epic:   Epic 4.13 — Reviews on a quiz.
 * Source ticket: T-4.13.19.
 *
 * ## What this component owns
 *
 *   - Section heading.
 *   - Public list (`ReviewsList`, T-4.13.18) — always visible.
 *   - Gated authoring surface (`ReviewForm`, T-4.13.15) — visible
 *     only to authenticated users after auth bootstrap resolves.
 *   - Resolve the authenticated viewer's current user id from
 *     `useAuthBootstrap` and forward it to the list / item
 *     ownership checks.
 *   - Forward the owner's my-review projection to the list so the
 *     owner's own row renders the inline editor.
 *
 * ## No moderation surface
 *
 * The widget never imports a reports or moderation route.
 *
 * ## Section error isolation
 *
 * The list and form live inside a single section. A review-section
 * error does NOT propagate to the parent quiz page. Each child
 * owns its own retry path.
 */

import { useMemo } from 'react';

import { ReviewForm } from '@/features/reviews/components/ReviewForm';
import { ReviewsList } from '@/features/reviews/components/ReviewsList';
import { useAuthBootstrap } from '@/features/auth/contexts/auth-bootstrap-context';
import { useMyQuizReview } from '@/features/reviews/hooks/useMyQuizReview';

// ─── Public types ────────────────────────────────────────────────────────────

export interface ReviewsWidgetProps {
  /** Canonical quiz id (NOT the slug). */
  quizId: string;
  /** Optional callback for the "Start attempt" gate CTA (Story 4.14). */
  onStartAttempt?: () => void;
  /** Optional href alternative for the gate CTA. */
  startAttemptHref?: string;
  /** Optional className for the section root. */
  className?: string;
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ReviewsWidget({
  quizId,
  onStartAttempt,
  startAttemptHref,
  className,
}: ReviewsWidgetProps): React.ReactElement {
  const { bootstrapState, currentUser } = useAuthBootstrap();

  // Resolve the current user id from the bootstrap. `null` until
  // the bootstrap resolves as `authenticated`.
  const currentUserId = useMemo<string | null>(() => {
    if (bootstrapState !== 'authenticated') return null;
    if (!currentUser) return null;
    const id = (currentUser as { id?: string; userId?: string }).id
      ?? (currentUser as { userId?: string }).userId;
    return id ?? null;
  }, [bootstrapState, currentUser]);

  // Fetch the viewer's my-review projection so the list's own-row
  // item can render the inline editor. The hook is disabled when
  // the viewer is unauthenticated.
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