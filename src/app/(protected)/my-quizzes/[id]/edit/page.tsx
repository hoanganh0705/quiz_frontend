import { Suspense } from "react";

import { QuizEditPage } from "@/features/quizzes/components/QuizEditPage";
import { QuizEditPageSkeleton } from "@/features/quizzes/components/QuizEditPageSkeleton";

import { PAGE_CONTAINER_CLASS } from "@/shared/layout/constants";
import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Edit Quiz | QuizHub",
  description: "Edit draft quiz versions, settings, and publish readiness.",
  path: "/my-quizzes",
  noIndex: true,
});

export default async function QuizEditRoutePage({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <main className={PAGE_CONTAINER_CLASS}>
      <Suspense fallback={<QuizEditPageSkeleton />}>
        <QuizEditPage quizId={id} />
      </Suspense>
    </main>
  );
}
