"use client";

import { AdminPageHeader } from "@/features/admin/components/AdminPageHeader";
import { ReviewReportsList } from "@/features/admin/review-moderation/components/ReviewReportsList";

export type ReviewReportsPageProps = Record<string, never>;

export function ReviewReportsPage(): React.ReactElement {
  return (
    <div
      className="min-h-screen w-full text-foreground p-4 md:p-8 lg:p-12 flex flex-col gap-6"
      data-testid="review-reports-page"
    >
      <AdminPageHeader
        title="Review Moderation"
        description="Triage and resolve reports filed against quiz reviews."
      />
      <ReviewReportsList />
    </div>
  );
}
