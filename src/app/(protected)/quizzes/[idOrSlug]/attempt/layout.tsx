import type { ReactNode } from 'react';

/**
 * Layout for the `/quizzes/[idOrSlug]/attempt` route.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.25.
 *
 * No metadata leaks attempt IDs, answers, or user data. The page
 * container handles auth gating; layout is intentionally empty so
 * the existing authenticated route-group layout (provider tree,
 * bootstrap context) is the only mount surface.
 */

export default function QuizAttemptLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}