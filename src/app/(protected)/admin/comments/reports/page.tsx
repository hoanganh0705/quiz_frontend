import { Suspense } from "react";

import { CommentReportsPage } from "@/features/admin/comment-moderation/components/CommentReportsPage";

import AdminLoading from "../../loading";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Comment Reports",
  description: "Review and moderate reported quiz comments.",
};

export default function AdminCommentReportsPage() {
  return (
    <Suspense fallback={<AdminLoading />}>
      <CommentReportsPage />
    </Suspense>
  );
}
