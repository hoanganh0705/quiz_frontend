/**
 * `/quiz-history/[attemptId]` — authenticated attempt detail route.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.22.
 *
 * Server component: awaits the route params and delegates to the
 * client `<AttemptDetailPage />` for auth gating and detail rendering.
 *
 * The route itself is a thin pass-through — no service / store /
 * state-machine logic. The metadata is generic and does not expose
 * the attempt ID, score, or any private user data.
 */

import { AttemptDetailPage } from "@/features/attempts";

export default async function QuizHistoryDetailPage({
  params,
}: {
  params: Promise<{ attemptId: string }>;
}) {
  const { attemptId } = await params;
  return <AttemptDetailPage attemptId={decodeURIComponent(attemptId)} />;
}
