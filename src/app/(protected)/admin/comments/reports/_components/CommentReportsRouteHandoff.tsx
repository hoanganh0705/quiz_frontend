"use client";

import { useEffect } from "react";

import { addCommentModerationBreadcrumb } from "@/lib/admin/admin_live_sentry";

import { CommentReportsPage } from "@/features/admin/comment-moderation/components/CommentReportsPage";

const COMMENT_MODERATION_CODES = Object.freeze([
  "COMMENT_REPORT_NOT_FOUND",
  "COMMENT_REPORT_ALREADY_RESOLVED",
  "COMMENT_NOT_HIDDEN",
  "COMMENT_ALREADY_HIDDEN",
] as const);

export function CommentReportsRouteHandoff() {

  useEffect(() => {
    addCommentModerationBreadcrumb({
      action: "comment.moderation.mount",
      route: "admin-comment-moderation.page",
      status: "started",
      durationMs: 0,
    });

    if (typeof console !== "undefined" && typeof console.warn === "function") {
      for (const code of COMMENT_MODERATION_CODES) {
        void code;
      }
    }
  }, []);

  return <CommentReportsPage />;
}
