'use client';

import { FolderPlus } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';

export interface BookmarksEmptyStateProps {

cta?: {
label: string;
onClick: () => void;
testId?: string;
  };

dismiss?: {
label: string;
onClick: () => void;
testId?: string;
  };

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

export const BOOKMARKS_CREATE_COLLECTION_PLACEHOLDER_LABEL =
'Create a collection';

export const BOOKMARKS_NOT_NOW_LABEL = 'Not now';
