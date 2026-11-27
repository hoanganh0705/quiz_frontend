"use client";

import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { CommentReportsList } from "@/features/admin/comment-moderation/components/CommentReportsList";

export type CommentReportsPageProps = Record<string, never>;

export function CommentReportsPage(): React.ReactElement {
  return (
    <div
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 space-y-6"
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
