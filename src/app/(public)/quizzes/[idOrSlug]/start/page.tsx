import { redirect } from 'next/navigation';

/**
 * Legacy `/quizzes/[idOrSlug]/start` route — redirects to the
 * canonical `/quizzes/[idOrSlug]/attempt` route.
 *
 * Source epic:   Epic 4.1 — SDK coverage & cross-cutting contracts.
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.26.
 *
 * The mock client-graded player that previously lived at this URL
 * has been retired (Story 4.14 establishes the server-backed,
 * no-spoiler runner as the only attempt entry path). Any visit to
 * the legacy URL lands on the canonical attempt route so users
 * cannot bypass the server-backed attempt flow.
 *
 * Slug and UUID `idOrSlug` values are preserved verbatim through the
 * redirect.
 */

export default async function QuizStartRedirectPage({
  params,
}: {
  params: Promise<{ idOrSlug: string }>;
}) {
  const { idOrSlug } = await params;
  redirect(`/quizzes/${encodeURIComponent(idOrSlug)}/attempt`);
}