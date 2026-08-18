

import { AttemptDetailPage } from "@/features/attempts";

export default async function QuizHistoryDetailPage({
params,
}: {
params: Promise<{ attemptId: string }>;
}) {
const { attemptId } = await params;
return <AttemptDetailPage attemptId={decodeURIComponent(attemptId)} />;
}
