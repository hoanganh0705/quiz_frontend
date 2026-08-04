import type { ReactNode } from 'react';

/**
 * Layout for the legacy `/quizzes/[idOrSlug]/start` route.
 *
 * Source story:  4.14 — Attempt start + answer + withdraw/abandon.
 * Source ticket: T-4.14.26.
 *
 * The page performs a server-side redirect, so the layout only
 * renders its children (which immediately redirect). No metadata is
 * emitted because no content is reachable through this URL.
 */

export default function QuizStartRedirectLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}