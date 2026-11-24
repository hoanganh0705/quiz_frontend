"use client";

import { AdminPageHeader } from "@/app/(protected)/admin/_components/AdminPageHeader";
import { CommentReportsList } from "@/features/admin/comment-moderation/components/CommentReportsList";

export type CommentReportsPageProps = Record<string, never>;

export function CommentReportsPage(): React.ReactElement {
  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 pt-6 space-y-6"
      data-testid="comment-reports-page"
    >
      <AdminPageHeader
        title="Comment Reports"
        description="Triage and resolve reports filed against quiz comments. Toggle between pending and resolved queues from the list header."
      />
      <CommentReportsList />
    </div>
  );
}
