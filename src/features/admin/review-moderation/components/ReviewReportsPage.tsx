"use client";

import { AdminPageHeader } from "@/app/(protected)/admin/_components/AdminPageHeader";
import { ReviewReportsList } from "@/features/admin/review-moderation/components/ReviewReportsList";

export type ReviewReportsPageProps = Record<string, never>;

export function ReviewReportsPage(): React.ReactElement {
  return (
    <div
      className="mx-auto max-w-7xl px-4 sm:px-6 pb-8 pt-6 flex flex-col gap-6"
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
