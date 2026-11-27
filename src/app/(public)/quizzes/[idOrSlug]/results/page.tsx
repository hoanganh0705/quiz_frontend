import {
  AttemptResultView,
  QuizResultsClientFallback,
} from "@/features/attempts";

export default async function QuizResultsPage({
  params,
  searchParams,
}: {
  params: Promise<{ idOrSlug: string }>;
  searchParams: Promise<{ attemptId?: string | string[] }>;
}) {
  const { idOrSlug } = await params;
  const resolvedSearchParams = await searchParams;
  const rawAttemptId = resolvedSearchParams?.attemptId;
  const attemptId = Array.isArray(rawAttemptId)
    ? rawAttemptId[0]
    : rawAttemptId;

  if (attemptId) {
    return <AttemptResultView mode="result" attemptId={attemptId} />;
  }

  return <QuizResultsClientFallback idOrSlug={idOrSlug} />;
}
