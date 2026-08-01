import { QuizDetailPage } from '@/features/quizzes';

export default async function QuizDetailRoute({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  return <QuizDetailPage idOrSlug={idOrSlug} />;
}
