import { buildMetadata } from "@/shared/lib/seo";

import { AttemptResultView } from "@/features/attempts";

export const metadata = buildMetadata({
  title: "Attempt Review | QuizHub",
  description: "Review your score breakdown and question-by-question feedback.",
  path: "/quiz-history",
  noIndex: true,
});

export default async function QuizHistoryDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <AttemptResultView mode="detail" attemptId={attemptId} />;
}
