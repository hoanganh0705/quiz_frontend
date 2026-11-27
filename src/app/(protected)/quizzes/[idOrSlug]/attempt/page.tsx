import { AttemptRunnerPage } from "@/features/attempts";

import { buildMetadata } from "@/shared/lib/seo";

export const metadata = buildMetadata({
  title: "Quiz Attempt | QuizHub",
  description: "Answer questions and complete your active quiz attempt.",
  path: "/quizzes",
  noIndex: true,
});

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  return <AttemptRunnerPage idOrSlug={idOrSlug} />;
}
