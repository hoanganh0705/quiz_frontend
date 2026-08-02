'use client';

/**
 * `<BookmarksSetupPrompt />` — the controlled Phase 3 dialog that
 * asks an authenticated user with zero bookmark collections to
 * create their first collection.
 *
 * Source epic:   Story 3.10 — Bookmarks add / remove + membership lookup.
 * Source ticket: TKT-3.10.D2.
 *
 * The prompt is a controlled, presentational dialog that wraps the
 * reusable `<BookmarksEmptyState />` (D3) body. It does NOT create,
 * rename, or delete collections — Phase 3 is a placeholder per
 * Story 3.10 line 1104. Phase 5 will swap the CTA handler.
 *
 * ## What this component owns
 *
 *   - The dialog presentation (header, body, footer, Escape-to-close,
 *     overlay dismissal).
 *   - The CTA + dismiss affordances.
 *   - Focus return to the triggering bookmark button when the user
 *     closes the prompt (D2 AC #3).
 *   - Keyboard-accessible focus traversal between the CTA and
 *     dismiss buttons (D2 AC #4).
 *
 * ## What this component does NOT own
 *
 *   - The collection CRUD API — `BookmarksEmptyState` + this
 *     component are pure presentations.
 *   - The mutation hooks (C1 / C2) — the slot (D4) decides when to
 *     open the prompt based on `lastOutcome.kind === 'no_collection'`.
 *   - SWR cache invalidation.
 */

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';

import BookmarksEmptyState, {
  BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL,
  BOOKMARKS_NOT_NOW_LABEL,
} from './BookmarksEmptyState';

export interface BookmarksSetupPromptProps {
  /**
   * Controlled open state.
   */
  open: boolean;
  /**
   * Dismiss handler — fires when the user closes the prompt
   * (Escape, overlay click, or "Not now"). The slot (D4) wires
   * this to restore focus to the triggering bookmark button.
   */
  onDismiss: () => void;
  /**
   * Optional CTA handler. The default mount in Phase 3 is a
   * no-op placeholder; Phase 5 will wire it to collection creation.
   */
  onCreateCollection?: () => void;
  /**
   * Optional className applied to the dialog content.
   */
  className?: string;
  /**
   * Optional test id for the dialog root. Defaults to
   * `'bookmarks-setup-prompt'`.
   */
  testId?: string;
}

/**
 * The imperative handle exposes the trigger element so the slot
 * (D4) can re-focus it when the user dismisses the prompt
 * (D2 AC #3).
 */
export interface BookmarksSetupPromptHandle {
  focusTrigger: () => void;
}

export const BookmarksSetupPrompt = forwardRef<
  BookmarksSetupPromptHandle,
  BookmarksSetupPromptProps
>(function BookmarksSetupPrompt(
  { open, onDismiss, onCreateCollection, className, testId },
  ref,
) {
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) {
      // When the prompt closes, capture the currently-focused
      // element as the trigger. The slot (D4) stashes the
      // bookmark button here via `data-bookmark-trigger` so the
      // dialog can locate the originating element.
      const trigger = document.querySelector<HTMLElement>(
        '[data-bookmark-trigger="true"]',
      );
      if (trigger) triggerRef.current = trigger;
    }
  }, [open]);

  useImperativeHandle(
    ref,
    () => ({
      focusTrigger: () => {
        triggerRef.current?.focus();
      },
    }),
    [],
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          onDismiss();
        }
      }}
    >
      <DialogContent
        data-testid={testId ?? 'bookmarks-setup-prompt'}
        className={className}
        // Hide the standard close (X) button — D2 has its own dismiss
        // affordance aligned with the project's modal convention.
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>Bookmark collections</DialogTitle>
          <DialogDescription>
            Organise your saved quizzes into collections. You'll be able to
            name them, sort them, and share them later.
          </DialogDescription>
        </DialogHeader>
        <BookmarksEmptyState />
        <DialogFooter>
          <Button
            type='button'
            variant='ghost'
            onClick={onDismiss}
            data-testid='bookmarks-setup-prompt-not-now'
          >
            {BOOKMARKS_NOT_NOW_LABEL}
          </Button>
          <Button
            type='button'
            onClick={() => {
              // Phase 3 placeholder — D2 AC #2: the CTA does NOT
              // call createCollection / updateCollection /
              // deleteCollection; Phase 5 wires the actual
              // createCollection call here.
              onCreateCollection?.();
            }}
            data-testid='bookmarks-setup-prompt-create'
          >
            {BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
});

export default BookmarksSetupPrompt;