/**
 * `/my-quizzes/[id]/versions/[versionId]/questions` — question editor route.
 *
 * Source epic:   Epic 4.10 — Question editor (single + bulk).
 * Source ticket: T-4.10.23 (routing integration).
 *
 * Thin route entry that delegates to `<QuestionEditorPage />`.
 *
 * ## Authentication
 *
 * This route is inside the `(protected)` layout group, which requires
 * authentication. Unauthenticated access redirects to the login page.
 *
 * ## Authorization
 *
 * Only the quiz owner can access this page. Non-owners see an access denied banner.
 *
 * ## Version Status
 *
 * Only draft versions can be edited. Published versions redirect to read-only view.
 */

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
