'use client';

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

open: boolean;

onDismiss: () => void;

onCreateCollection?: () => void;

className?: string;

testId?: string;
}

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