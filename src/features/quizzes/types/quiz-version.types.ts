import type {
  CreateQuizVersionDto,
  QuizVersionDetailResponseDto,
  QuizVersionResponseDto,
  UpdateQuizVersionDto,
} from "@/lib/api/generated/schemas";

export type QuizVersionSummary = QuizVersionResponseDto & { id: string };

export type QuizVersionDetail = QuizVersionDetailResponseDto;

export interface QuizAuthorView {
  quizId: string;

  title: string;

  description: string | null;

  slug: string;

  creatorId: string | null;

  imageUrl: string | null;

  categoryId: string | null;

  isHidden: boolean;

  publishedVersionId: string | null;

  createdAt: string;

  updatedAt: string;
}

export type { CreateQuizVersionDto, UpdateQuizVersionDto };
