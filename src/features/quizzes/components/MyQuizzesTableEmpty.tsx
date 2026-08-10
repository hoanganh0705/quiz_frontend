/**
 * `MyQuizzesTableEmpty` — per-tab empty state for the quizzes table.
 *
 * Source epic:   Epic 4.4 — Authored quizzes list + analytics.
 * Source ticket: TKT-4.4.C2.
 *
 * Renders a centred empty state with tab-specific copy and an optional CTA.
 * Accepts `tab` prop to vary the copy:
 *   - `'all'`:      "You haven't created any quizzes yet — create your first one." → `/create-quiz`
 *   - `'drafts'`:   "No drafts. Start a new quiz from the create page."       → `/create-quiz`
 *   - `'published'`: "Nothing published yet."                                 → no CTA
 */

import Link from "next/link";

import { Inbox, PenLine, Globe } from "lucide-react";

import { EmptyState } from "@/components/ui/EmptyState";

import type { MyQuizzesTab } from "@/features/quizzes/types/my-quizzes";

interface MyQuizzesTableEmptyProps {
  /** Which tab is currently active. */
  tab: "all" | "drafts" | "published";
}

const CONTENT: Record<
  MyQuizzesTableEmptyProps["tab"],
  { title: string; description: string; ctaLabel?: string }
> = {
  all: {
    title: "You haven't created any quizzes yet",
    description: "Create your first one to get started.",
    ctaLabel: "Create Quiz",
  },
  drafts: {
    title: "No drafts",
    description: "Start a new quiz from the create page.",
    ctaLabel: "Create Quiz",
  },
  published: {
    title: "Nothing published yet",
    description: "Publish a draft to see it here.",
  },
};

const ICONS: Record<MyQuizzesTableEmptyProps["tab"], React.ComponentType<unknown>> = {
  all: Inbox as unknown as React.ComponentType<unknown>,
  drafts: PenLine as unknown as React.ComponentType<unknown>,
  published: Globe as unknown as React.ComponentType<unknown>,
};

/**
 * Empty state for the author's quizzes table.
 */
export function MyQuizzesTableEmpty({
  tab,
}: MyQuizzesTableEmptyProps): React.ReactElement {
  const content = CONTENT[tab];
  const hasCta = Boolean(content.ctaLabel);

  return (
    <EmptyState
      icon={ICONS[tab]}
      title={content.title}
      description={content.description}
      actions={
        hasCta
          ? [
              {
                label: content.ctaLabel!,
                href: "/create-quiz",
                variant: "default" as const,
              },
            ]
          : undefined
      }
    />
  );
}
