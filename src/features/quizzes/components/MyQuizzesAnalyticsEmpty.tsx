/**
 * `MyQuizzesAnalyticsEmpty` — zero-activity empty state for the analytics tab.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.C4.
 *
 * Renders the "No activity yet" placeholder when the author has no published
 * quizzes (the analytics endpoint returns 404 or all values are zero).
 * No CTA — the path forward is to publish a quiz from the drafts tab.
 */

import { BarChart3 } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

/**
 * Empty state for the author's analytics tab.
 * Used when the user has no published quizzes or all analytics are zero.
 */
export function MyQuizzesAnalyticsEmpty(): React.ReactElement {
  return (
    <EmptyState
      icon={BarChart3}
      title="Analytics will populate after you publish a quiz."
      description="Once players start taking your quizzes, you'll see stats here."
    />
  );
}
