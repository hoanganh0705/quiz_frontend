'use client';

/**
 * `<BookmarksEmptyState />` — the reusable explanatory content body
 * for the zero-collection bookmark surface.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D3.
 *
 * Provides the title, explanation, primary CTA slot, and optional
 * dismiss slot used inside the `<BookmarksSetupPrompt />` (D2)
 * dialog body and any other zero-collection affordance. This
 * component performs no navigation, mutation, auth read, or
 * collection creation itself — the consumer decides what the CTA
 * and dismiss buttons do.
 *
 * ## Why a separate component
 *
 * The Phase 3 modal/strip primitive (D2) owns the dialog
 * presentation; the same explanatory copy must be reusable outside
 * a dialog (e.g. a slide-over, an inline card placeholder, a
 * standalone page hero) without duplicating copy. Splitting the
 * body from the dialog mirrors the project's `<EmptyState />`
 * convention.
 *
 * ## Phase 3 behavior
 *
 *   - Static, memo-friendly content.
 *   - The "Create a collection" CTA is a placeholder — Phase 5
 *     wires collection creation. D3 AC #2 mirrors the C1 hook
 *     contract: D2's mount of this component MUST NOT fire
 *     `createCollection` / `updateCollection` / `deleteCollection`.
 *   - The optional dismiss slot is consumed by D2 to render
 *     "Not now" and recover focus to the triggering bookmark
 *     button on dismissal.
 *
 * ## Existing legacy content
 *
 * The legacy `<EmptyBookmarks />` component (`./EmptyBookmarks.tsx`)
 * covers the `/bookmarks` route and is unaffected — D3 AC #4.
 */

import { FolderPlus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export interface BookmarksEmptyStateProps {
  /**
   * Optional CTA slot. When omitted, no CTA is rendered. The CTA
   * is intentionally a placeholder; D2's mount MUST NOT wire it
   * to `createCollection` until Phase 5 lands.
   */
  cta?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  /**
   * Optional dismiss slot. When omitted, no dismiss button is
   * rendered. D2 forwards its own dismiss affordance here.
   */
  dismiss?: {
    label: string;
    onClick: () => void;
    testId?: string;
  };
  /**
   * Optional className applied to the outer wrapper.
   */
  className?: string;
}

const TITLE = 'Create your first collection';
const DESCRIPTION =
  'Collections let you group your bookmarked quizzes so you can find them again. You can have as many collections as you like — a "Favourites" set, a "Study list", and so on.';

function BookmarksEmptyState({
  cta,
  dismiss,
  className,
}: BookmarksEmptyStateProps) {
  return (
    <div data-testid='bookmarks-empty-state' className={className}>
      <EmptyState
        icon={FolderPlus}
        title={TITLE}
        description={DESCRIPTION}
        actions={
          cta || dismiss
            ? [
                ...(cta
                  ? [
                      {
                        label: cta.label,
                        onClick: cta.onClick,
                        icon: FolderPlus,
                      },
                    ]
                  : []),
                ...(dismiss
                  ? [
                      {
                        label: dismiss.label,
                        onClick: dismiss.onClick,
                        variant: 'ghost' as const,
                      },
                    ]
                  : []),
              ]
            : undefined
        }
      />
      {/* The slot-level `data-testid` for the CTA / dismiss buttons
          — the EmptyState primitive renders a button row with the
          labels as text; tests assert via the text content. */}
    </div>
  );
}

export default BookmarksEmptyState;

/**
 * The Phase 3 placeholder CTA label. D2 mounts this and renders
 * a "no-op" handler so the contract (no collection create/rename/
 * delete in Phase 3) is preserved.
 */
export const BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL =
  'Create a collection';
/**
 * The Phase 3 placeholder dismiss label. D2 mounts this on the
 * dismiss affordance.
 */
export const BOOKMARKS_NOT_NOW_LABEL = 'Not now';
