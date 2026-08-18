

import { Suspense } from 'react';

import { QuestionEditorPage } from '@/features/quizzes/components/QuestionEditor';

function QuestionEditorPageSkeleton(): React.ReactElement {
return (
<div className="space-y-6 p-6">
<div className="space-y-2">
<div className="h-4 w-48 animate-pulse rounded bg-muted" />
<div className="h-8 w-96 animate-pulse rounded bg-muted" />
</div>
<div className="h-12 w-full max-w-md animate-pulse rounded-lg bg-muted" />
<div className="space-y-3">
{[1, 2, 3].map((i) => (
<div key={i} className="h-24 w-full animate-pulse rounded-lg bg-muted" />
        ))}
</div>
<div className="rounded-lg border p-6">
<div className="space-y-4">
<div className="h-24 w-full animate-pulse rounded bg-muted" />
<div className="h-10 w-full animate-pulse rounded bg-muted" />
</div>
</div>
</div>
  );
}

export default function QuestionEditorRoutePage(): React.ReactElement {
return (
<Suspense fallback={<QuestionEditorPageSkeleton />}>
<QuestionEditorPage />
</Suspense>
  );
}
