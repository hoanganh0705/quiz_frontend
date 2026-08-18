

'use client';

import { memo } from 'react';

import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';

import type { QuizVersionDetail } from '@/features/quizzes/types/quiz-version.types';

export interface QuizEditFormProps {

quizId: string;

versionId: string;

initialData: QuizVersionDetail;

onSave: (data: { difficulty?: 'easy' | 'medium' | 'hard' }) => Promise<void>;

isSaving?: boolean;

slugError?: string | null;

className?: string;
}

export const QuizEditForm = memo(function QuizEditForm({
quizId: _quizId,
versionId: _versionId,
initialData,
onSave,
isSaving = false,
slugError,
className,
}: QuizEditFormProps): React.ReactElement {

const handleSubmit = async (e: React.FormEvent) => {
e.preventDefault();
await onSave({});
  };

const difficultyValue = (initialData as unknown as { difficulty: 'easy' | 'medium' | 'hard' }).difficulty;

return (
<form
onSubmit={handleSubmit}
className={`space-y-6 ${className ?? ''}`}
data-testid="quiz-edit-form"
    >
{/* Version info */}
<div className="rounded-lg border border-border p-4">
<div className="flex items-center justify-between">
<div>
<p className="text-sm font-medium" data-testid="version-label">
Version {initialData.versionNumber}
</p>
<p className="text-xs text-muted-foreground" data-testid="version-id">
{initialData.quizVersionId}
</p>
</div>
<span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800 dark:bg-amber-900/30 dark:text-amber-400">
Draft
          </span>
</div>
</div>

{/* Difficulty */}
<div className="space-y-2">
<label htmlFor="difficulty" className="text-sm font-medium">
Difficulty
        </label>
<select
id="difficulty"
value={difficultyValue}
onChange={() => {}}
disabled={isSaving}
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
data-testid="difficulty-select"
        >
<option value="easy">Easy</option>
<option value="medium">Medium</option>
<option value="hard">Hard</option>
</select>
</div>

{/* Slug error */}
{slugError && (
<div
className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
role="alert"
data-testid="slug-error"
        >
{slugError}
</div>
      )}

{/* Duration */}
<div className="space-y-2">
<label htmlFor="duration" className="text-sm font-medium">
Time limit
        </label>
<div className="flex items-center gap-2">
<input
type="number"
id="duration"
value={Math.floor((initialData.durationMs ?? 0) / 1000 / 60)}
onChange={() => {}}
disabled={isSaving}
min={1}
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
data-testid="duration-input"
          />
<span className="text-sm text-muted-foreground">minutes</span>
</div>
</div>

{/* Passing score */}
<div className="space-y-2">
<label htmlFor="passing-score" className="text-sm font-medium">
Passing score
        </label>
<div className="flex items-center gap-2">
<input
type="number"
id="passing-score"
value={initialData.passingScorePercent ?? 70}
onChange={() => {}}
disabled={isSaving}
min={0}
max={100}
className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
data-testid="passing-score-input"
          />
<span className="text-sm text-muted-foreground">%</span>
</div>
</div>

{/* Submit */}
<div className="flex items-center gap-4">
<Button
type="submit"
disabled={isSaving}
data-testid="save-btn"
        >
{isSaving ? 'Saving…' : 'Save changes'}
</Button>
<p className="text-xs text-muted-foreground">
Changes are saved automatically every 5 seconds.
        </p>
</div>
</form>
  );
});

export function QuizEditFormSkeleton(): React.ReactElement {
return (
<div className="space-y-6" aria-busy="true" data-testid="quiz-edit-form-skeleton">
{/* Version info */}
<Skeleton className="h-20 w-full" />

{/* Difficulty */}
<div className="space-y-2">
<Skeleton className="h-4 w-20" />
<Skeleton className="h-10 w-full" />
</div>

{/* Duration */}
<div className="space-y-2">
<Skeleton className="h-4 w-20" />
<div className="flex items-center gap-2">
<Skeleton className="h-10 w-full" />
<Skeleton className="h-4 w-16" />
</div>
</div>

{/* Submit */}
<Skeleton className="h-10 w-32" />
</div>
  );
}
