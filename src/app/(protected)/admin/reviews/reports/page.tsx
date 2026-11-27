import { Suspense } from "react";

import { ReviewReportsPage } from "@/features/admin/review-moderation/components/ReviewReportsPage";

import AdminLoading from "../../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Review Reports",
  description: "Review and resolve flagged quiz reviews.",
};

export default function AdminReviewReportsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <ReviewReportsPage />
    </Suspense>
  );
}
