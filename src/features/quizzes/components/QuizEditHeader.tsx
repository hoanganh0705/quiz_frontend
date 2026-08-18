

'use client';

import { memo } from 'react';
import Link from 'next/link';

import { Button } from '@/components/ui/Button';
import { ArrowLeft, Plus, Loader2 } from 'lucide-react';

export interface QuizEditHeaderProps {

title: string;

onNewVersion: () => void;

isCreatingVersion?: boolean;

canEdit?: boolean;

className?: string;
}

export const QuizEditHeader = memo(function QuizEditHeader({
title,
onNewVersion,
isCreatingVersion = false,
canEdit = true,
className,
}: QuizEditHeaderProps): React.ReactElement {
return (
<header
className={className}
data-testid="quiz-edit-header"
    >
<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
{/* Left: back link + title */}
<div className="flex flex-col gap-2">
<Link
href="/my-quizzes"
className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
data-testid="back-link"
          >
<ArrowLeft className="h-4 w-4" aria-hidden="true" />
Back to My Quizzes
          </Link>

<h1
className="text-2xl font-semibold tracking-tight"
data-testid="quiz-title"
          >
{title}
</h1>
</div>

{/* Right: actions */}
{canEdit && (
<div className="flex items-center gap-3">
<Button
variant="outline"
size="sm"
onClick={onNewVersion}
disabled={isCreatingVersion}
data-testid="new-version-btn"
            >
{isCreatingVersion ? (
<>
<Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
Creating…
                </>
              ) : (
<>
<Plus className="h-4 w-4" aria-hidden="true" />
New version
                </>
              )}
</Button>
</div>
        )}
</div>
</header>
  );
});
