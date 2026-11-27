import type { CommentFilters } from "@/features/comments/types/comment.types";

export const COMMENT_KEYS = {
  all: ["comments"] as const,
  byQuiz: (quizId: string) => ["comments", quizId] as const,
  list: (quizId: string, filters?: CommentFilters) =>
    [
      "comments",
      quizId,
      [
        filters?.parentId ?? undefined,
        filters?.cursor ?? undefined,
        filters?.limit ?? undefined,
      ],
    ] as const,
} as const;
