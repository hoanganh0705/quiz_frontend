/**
 * `/quiz-history` — authenticated quiz history list route.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.15 — Attempt complete + score breakdown + my-attempts page.
 * Source ticket: T-4.15.23.
 *
 * Server component: delegates rendering to the live
 * `<QuizHistoryPage />` from Story 4.15.
 *
 * The route itself is a thin pass-through — no service / store /
 * state-machine logic. No Phase 3 mock constants or mock components
 * are imported.
 *
 * This file previously contained the Phase 3 mock implementation
 * (T-4.15.23 migration from mock to live).
 */

import { QuizHistoryPage } from "@/features/attempts";

export default function Route() {
  return <QuizHistoryPage />;
}
