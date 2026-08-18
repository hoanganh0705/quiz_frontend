

'use client';

import { memo } from 'react';

import { Button } from '@/components/ui/Button';

export interface QuestionEditorEmptyStateProps {

minRequired?: number;

onAddQuestion?: () => void;

addButtonDisabled?: boolean;
}

const EmptyIllustration = (): React.ReactElement => (
<svg
className="mx-auto h-32 w-32 text-muted-foreground/50"
viewBox="0 0 128 128"
fill="none"
xmlns="http://www.w3.org/2000/svg"
aria-hidden="true"
  >
{/* Question mark circle */}
<circle
cx="64"
cy="64"
r="56"
stroke="currentColor"
strokeWidth="4"
strokeDasharray="8 8"
    />
{/* Question mark */}
<path
d="M64 32C49.088 32 37 44.088 37 59C37 69.5 43 78.5 52 83V88"
stroke="currentColor"
strokeWidth="6"
strokeLinecap="round"
strokeLinejoin="round"
    />
<circle cx="64" cy="100" r="4" fill="currentColor" />
{/* Decorative dots */}
<circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3" />
<circle cx="104" cy="24" r="4" fill="currentColor" opacity="0.3" />
<circle cx="24" cy="104" r="4" fill="currentColor" opacity="0.3" />
<circle cx="104" cy="104" r="4" fill="currentColor" opacity="0.3" />
</svg>
);

export const QuestionEditorEmptyState = memo(function QuestionEditorEmptyState({
minRequired = 5,
onAddQuestion,
addButtonDisabled,
}: QuestionEditorEmptyStateProps): React.ReactElement {
return (
<div
className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/30 bg-muted/20 p-12 text-center"
data-testid="question-editor-empty-state"
    >
{/* Illustration */}
<EmptyIllustration />

{/* Text */}
<h3 className="mt-6 text-lg font-semibold">No questions yet</h3>
<p className="mt-2 max-w-sm text-sm text-muted-foreground">
This version has no questions. Add at least {minRequired} to publish.
      </p>

{/* CTA */}
{onAddQuestion && (
<Button
className="mt-6"
onClick={onAddQuestion}
disabled={addButtonDisabled}
        >
Add your first question
        </Button>
      )}
</div>
  );
});
