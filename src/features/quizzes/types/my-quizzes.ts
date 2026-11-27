import type {
  QuizListItemDto,
  CreatorQuizAnalyticsDto,
} from "@/lib/api/generated/schemas";

export type MyQuizzesTab = "all" | "drafts" | "published" | "analytics";

export type MyQuizListItem = QuizListItemDto & { id: string };

export type MyQuizzesAnalytics = CreatorQuizAnalyticsDto;
