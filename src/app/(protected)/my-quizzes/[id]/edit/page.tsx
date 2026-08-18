

import { Suspense } from 'react';

import { QuizEditPage } from '@/features/quizzes/components/QuizEditPage';
import { QuizEditPageSkeleton } from '@/features/quizzes/components/QuizEditPageSkeleton';

export default function QuizEditRoutePage(): React.ReactElement {
return (
<Suspense fallback={<QuizEditPageSkeleton />}>
<QuizEditPage />
</Suspense>
  );
}
