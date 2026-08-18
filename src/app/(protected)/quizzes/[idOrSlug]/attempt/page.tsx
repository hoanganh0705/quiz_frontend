

import { AttemptRunnerPage } from '@/features/attempts';

export default async function QuizAttemptPage({
params,
}: {
params: Promise<{ idOrSlug: string }>;
}) {
const { idOrSlug } = await params;
return <AttemptRunnerPage idOrSlug={decodeURIComponent(idOrSlug)} />;
}