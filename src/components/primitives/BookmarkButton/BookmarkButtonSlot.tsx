'use client';

/**
 * `<BookmarkButtonSlot />` — the per-feature composition that wires
 * the bookmark membership, action hooks, error mapper, and setup
 * prompt into a single component consumed by `<QuizCard />` and the
 * quiz detail CTA strip.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D4.
 *
 * ## What this slot owns
 *
 *   - The auth + membership + action hook composition:
 *       `useAuthState()` (auth gate — D4 AC #7)
 *       `useIsBookmarked(quizId)` (B4 — live membership reader)
 *       `useBookmarkQuiz(quizId)` (C1 — action + outcome)
 *       `useUnbookmarkQuiz(quizId)` (C2 — action + outcome)
 *
 *   - The error-state mapping via `getBookmarkMutationErrorState`
 *     (C3) so the C1/C2 error-taxonomy data is converted to a single
 *     union the controlled primitive (D1) consumes.
 *
 *   - The setup-prompt open/close state driven by the C1 outcome
 *     (`lastOutcome.kind === 'no_collection'`, D4 AC #3).
 *
 *   - The two variants:
 *       `variant="card"` — icon-only; suppresses parent-link
 *         navigation via a bubble-phase `onClick` on the slot
 *         wrapper that calls `e.preventDefault()` +
 *         `e.stopPropagation()` when the click target is inside
 *         the bookmark button (D4 AC #5).
 *       `variant="detail"` — icon-with-label; no parent-link to
 *         suppress because the placement is a non-anchor strip
 *         (D4 AC #6).
 *
 * ## What this slot does NOT own
 *
 *   - The `<BookmarkButton />` rendering internals — D1 owns the
 *     aria / data-testid / icon variants.
 *   - The `<BookmarksSetupPrompt />` body — D2 + D3 own the dialog
 *     presentation and the empty-state copy.
 *   - The SWR cache mutation on success / rollback — the C1/C2
 *     hooks own it via `useOptimisticToggle`.
 *   - Sentry / `captureException` — the errorState surfaces through
 *     `<BookmarkButtonErrorNotice />`; no logging side-effects in
 *     the slot.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import type { MouseEvent } from 'react';

import {
  BookmarkButton,
  type BookmarkButtonVariant,
} from '@/components/primitives/BookmarkButton';
import { useAuthState } from '@/features/auth/hooks/use-auth-state';
import {
  useBookmarkCollections,
} from '@/features/bookmarks/hooks/use-bookmark-collections';
import {
  useDefaultCollectionId,
} from '@/features/bookmarks/hooks/use-default-collection-id';
import {
  useBookmarkQuiz,
} from '@/features/bookmarks/hooks/use-bookmark-quiz';
import {
  useUnbookmarkQuiz,
} from '@/features/bookmarks/hooks/use-unbookmark-quiz';
import {
  BookmarksSetupPrompt,
} from '@/features/bookmarks/components/BookmarksSetupPrompt';
import {
  getBookmarkMutationErrorState,
} from '@/features/bookmarks/utils';
import { useIsBookmarked } from '@/features/quizzes/hooks/useIsBookmarked';
import { cn } from '@/shared/utils/merge-class-names';

export type BookmarkButtonSlotVariant = 'card' | 'detail';

export interface BookmarkButtonSlotProps {
  /**
   * The resolved quiz entity UUID. The slot accepts the same
   * "always-defined" contract as `useIsBookmarked` and the C1/C2
   * action hooks — page-level guards render the slot only after
   * the quizId exists.
   */
  quizId: string;
  /**
   * The visual variant. `card` (default) renders the icon-only
   * button with parent-link click suppression. `detail` renders
   * the icon-with-label button without parent-link suppression.
   */
  variant?: BookmarkButtonSlotVariant;
  /**
   * Optional className applied to the outer wrapper.
   */
  className?: string;
}

export function BookmarkButtonSlot({
  quizId,
  variant = 'card',
  className,
}: BookmarkButtonSlotProps) {
  // Auth gate. Unauthenticated states never fire action hooks (D4
  // AC #7); the controlled primitive (D1) renders the disabled
  // sign-in branch via `isAuthenticated={isAuthenticated}`.
  const { isAuthenticated } = useAuthState();

  // Live membership reader. `isLoading` flips true while the
  // membership SWR hydrates; the primitive's loading branch takes
  // care of the unknown state.
  const { isBookmarked, isLoading: membershipLoading } =
    useIsBookmarked(quizId);

  // The action hooks — both C1 (add) and C2 (remove) read from
  // the same SWR cache via the optimistic-toggle primitive. The
  // slot picks the right one based on the current `isBookmarked`
  // state on click.
  const {
    isPending: isBookmarkedPending,
    lastError: bookmarkError,
    lastOutcome: bookmarkOutcome,
    bookmark,
  } = useBookmarkQuiz(quizId);
  const {
    isPending: isUnbookmarkedPending,
    lastError: unbookmarkError,
    lastOutcome: unbookmarkOutcome,
    unbookmark,
  } = useUnbookmarkQuiz(quizId);

  // Coalesce pending state — only one action can be in-flight at a
  // time (the primitive's 500 ms cooldown). The primitive exposes
  // disabled-while-pending via the D1 button.
  const isPending = isBookmarkedPending || isUnbookmarkedPending;

  // Coalesce lastError — both hooks share the discriminated
  // `OptimisticToggleError | null` shape.
  const lastError = bookmarkError ?? unbookmarkError;

  const handleToggle = useCallback(() => {
    // Card-variant parent-link suppression (D4 AC #5) is owned by
    // the slot wrapper's bubble-phase `onClick` (handleSlotClick
    // below). Here we simply dispatch to the matching action hook
    // based on the current membership state.
    if (isBookmarked) {
      void unbookmark();
    } else {
      void bookmark();
    }
  }, [isBookmarked, bookmark, unbookmark]);

  // Setup prompt state (D4 AC #3). The C1 hook exposes
  // `lastOutcome.kind === 'no_collection'` whenever the user owns
  // zero collections. When that fires we open the prompt. We track
  // dismissal in local state so the prompt STAYS closed after the
  // user clicks "Not now" — even if the outcome is still
  // `no_collection`. The visible `setupOpen` is the boolean the
  // controlled dialog (D2) consumes.
  const lastOutcome =
    bookmarkOutcome ?? unbookmarkOutcome;
  const isNoCollection =
    (lastOutcome as { kind?: string } | null)?.kind === 'no_collection';
  const [setupOpen, setSetupOpen] = useState(false);

  // Sync `setupOpen` to the outcome. We use an effect here because
  // the open/closed state depends on TWO signals: the outcome AND
  // the user's prior dismissal. Resetting dismissal in render
  // (via refs) trips the `react-hooks/refs` lint rule. The effect
  // path is the documented React pattern for "state derived from
  // an external signal with interactive override".
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSetupOpen((current) => current || isNoCollection);
  }, [isNoCollection]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleDismiss = useCallback(() => {
    setSetupOpen(false);
  }, []);

  // Wire the bookmark button as `data-bookmark-trigger="true"` so
  // `<BookmarksSetupPrompt />` (D2 AC #3) can re-focus the
  // originating button when the dialog closes. We attach the
  // attribute in a layout effect that runs after every render —
  // the slot's render is cheap and this keeps the attribute in
  // sync with whichever button variant currently renders.
  const slotRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = slotRef.current?.querySelector<HTMLElement>(
      'button[data-testid^="bookmark-button"]',
    );
    if (el) {
      el.setAttribute('data-bookmark-trigger', 'true');
    }
  });

  // The C3 mapper collapses the C1/C2 outcomes + the primitive's
  // error taxonomy into the single union the primitive consumes.
  const errorState = getBookmarkMutationErrorState(
    lastError,
    lastOutcome,
  );

  // Map the slot variant to the controlled `BookmarkButton`
  // variant. `card` → icon-only; `detail` → icon-with-label.
  const buttonVariant: BookmarkButtonVariant =
    variant === 'detail' ? 'iconWithLabel' : 'icon';

  // Parent-link click suppression for card variant (D4 AC #5).
  // We attach a BUBBLE-phase `onClick` on the slot wrapper. The
  // bookmark button's `onClick` is the click TARGET, so it fires
  // first; the event then bubbles up through the slot wrapper.
  // Here we `stopPropagation()` + `preventDefault()` ONLY when the
  // click originated inside the bookmark button — preventing the
  // parent `<a>`'s default navigation. We use the bubble phase so
  // the target's onClick is not affected by stopPropagation in the
  // capture phase (React's event delegation requires the target's
  // handler to fire before any stopPropagation can take effect).
  const handleSlotClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (variant !== 'card') return;
      const target = event.target as HTMLElement | null;
      if (target && target.closest('[data-testid^="bookmark-button"]')) {
        event.stopPropagation();
        event.preventDefault();
      }
    },
    [variant],
  );

  // Don't render anything until we know whether collections have
  // hydrated; this avoids the C1 hook's deferred `no_collection`
  // outcome firing during hydration. We use the same SWR key
  // (`useBookmarkCollections().isLoading`) as `useIsBookmarked`
  // so the loading branch reflects the canonical SWR state.
  const { isLoading: collectionsLoading } = useBookmarkCollections();
  const {
    defaultCollectionId: derivedDefaultCollectionId,
    isLoading: defaultCollectionLoading,
  } = useDefaultCollectionId();
  if (collectionsLoading && isAuthenticated) {
    return (
      <div
        ref={slotRef}
        className={cn('inline-flex', className)}
        data-testid='bookmark-button-slot'
        data-state='loading'
        data-variant={variant}
        data-default-collection-id={derivedDefaultCollectionId ?? ''}
        data-default-collection-loading={
          defaultCollectionLoading ? 'true' : 'false'
        }
        onClick={handleSlotClick}
      >
        <BookmarkButton
          isBookmarked={false}
          isLoading
          isAuthenticated={isAuthenticated}
          isPending={false}
          errorState={null}
          onToggle={() => {
            /* loading branch — no-op */
          }}
          variant={buttonVariant}
        />
      </div>
    );
  }
  return (
    <div
      ref={slotRef}
      className={cn('inline-flex', className)}
      data-testid='bookmark-button-slot'
      data-state='resolved'
      data-variant={variant}
      data-authenticated={isAuthenticated ? 'true' : 'false'}
      data-bookmarked={isBookmarked ? 'true' : 'false'}
      data-default-collection-id={derivedDefaultCollectionId ?? ''}
      data-default-collection-loading={
        defaultCollectionLoading ? 'true' : 'false'
      }
      onClick={handleSlotClick}
    >
      <BookmarkButton
        isBookmarked={isBookmarked}
        isLoading={membershipLoading}
        isAuthenticated={isAuthenticated}
        isPending={isPending}
        errorState={errorState.kind === 'ok' ? null : errorState}
        onToggle={handleToggle}
        variant={buttonVariant}
      />
      <BookmarksSetupPrompt
        open={setupOpen}
        onDismiss={handleDismiss}
      />
    </div>
  );
}