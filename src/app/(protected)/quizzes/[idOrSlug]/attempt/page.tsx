/**
 * `/quizzes/[idOrSlug]/attempt` — authenticated attempt runner route.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.25.
 *
 * Server component: awaits the route params and delegates to the
 * client `<AttemptRunnerPage />` for auth gating, feature-flag
 * handling, and the runner shell.
 *
 * The route itself is a thin pass-through — no service / store /
 * state-machine logic.
 */

import { AttemptRunnerPage } from '@/features/attempts';

export default async function QuizAttemptPage({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  return <AttemptRunnerPage idOrSlug={decodeURIComponent(idOrSlug)} />;
}