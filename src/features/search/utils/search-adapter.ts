import type { ApiError } from "@/lib/api";
import type { SearchResponseDto as SearchResponseWireDto } from "@/lib/api/generated/schemas/searchResponseDto";

import type {
  SearchErrorCode,
  SearchGroup,
  SearchResponseDto,
  SearchResultKind,
} from "@/features/search/types/search.types";

export const SEARCH_MIN_QUERY_LENGTH = 2;

export function buildHrefForKind(
  kind: SearchResultKind,
  item: { id: string; slug?: string | null },
): string {
  switch (kind) {
    case "quiz":
      return `/quizzes/${item.slug ?? item.id}`;
    case "user":
      return `/profile/${item.id}`;
    case "tournament":
      return `/tournaments/${item.id}`;
    case "achievement":
      return `/achievements#${item.id}`;
    case "ranking":
      return `/leaderboard#${item.id}`;
    case "tag":
      return `/tags/${item.id}`;
    case "category":
      return `/categories/${item.id}`;
    case "comment":
      return `/quizzes/${item.id}#comments`;
    case "social":
      return `/profile/${item.id}`;
    default:
      return "/";
  }
}

type WireQuiz = {
  quizId: string;
  title: string;
  slug: string;
};
type WireUser = {
  userId: string;
  username: string;
  displayName?: string | null;
};
type WireTag = { tagId: string; name: string };
type WireComment = { commentId: string; quizId: string };
type WireCategory = {
  categoryId: string;
  name: string;
};

export function adaptWireToFeature(
  wire: SearchResponseWireDto,
): SearchResponseDto {
  const groups: Partial<Record<SearchResultKind, SearchGroup<unknown>>> = {};

  const quizzes = (wire.quizzes ?? []).map((q: WireQuiz) => ({
    id: q.quizId,
    quizId: q.quizId,
    title: q.title,
    slug: q.slug,
    displayName: q.title,
    subtitle: undefined,
    href: buildHrefForKind("quiz", { id: q.quizId, slug: q.slug }),
    visibility: "public" as const,
  }));
  if (quizzes.length > 0) {
    groups.quiz = {
      kind: "quiz",
      items: quizzes,
      visibility: "public",
    };
  }

  const users = (wire.users ?? []).map((u: WireUser) => ({
    id: u.userId,
    userId: u.userId,
    username: u.username,
    displayName: u.displayName ?? u.username,
    subtitle:
      u.username !== (u.displayName ?? u.username) ? u.username : undefined,
    href: buildHrefForKind("user", { id: u.userId }),
    visibility: "public" as const,
  }));
  if (users.length > 0) {
    groups.user = {
      kind: "user",
      items: users,
      visibility: "public",
    };
  }

  const tags = (wire.tags ?? []).map((t: WireTag) => ({
    id: t.tagId,
    tagId: t.tagId,
    name: t.name,
    displayName: t.name,
    subtitle: undefined,
    href: buildHrefForKind("tag", { id: t.tagId }),
    visibility: "public" as const,
  }));
  if (tags.length > 0) {
    groups.tag = {
      kind: "tag",
      items: tags,
      visibility: "public",
    };
  }

  const categories = (wire.categories ?? []).map((c: WireCategory) => ({
    id: c.categoryId,
    categoryId: c.categoryId,
    name: c.name,
    displayName: c.name,
    subtitle: undefined,
    href: buildHrefForKind("category", { id: c.categoryId }),
    visibility: "public" as const,
  }));
  if (categories.length > 0) {
    groups.category = {
      kind: "category",
      items: categories,
      visibility: "public",
    };
  }

  const comments = (wire.comments ?? []).map((c: WireComment) => ({
    id: c.commentId,
    commentId: c.commentId,
    quizId: c.quizId,
    displayName: "Comment",
    subtitle: undefined,
    href: buildHrefForKind("comment", { id: c.quizId }),
    visibility: "public" as const,
  }));
  if (comments.length > 0) {
    groups.comment = {
      kind: "comment",
      items: comments,
      visibility: "public",
    };
  }

  return {
    query: wire.query,
    groups,
  };
}

export function mapApiErrorToSearchCode(
  apiErr: ApiError,
  trimmedQueryLength: number,
): SearchErrorCode {
  const code = apiErr.code;
  const status = apiErr.status;

  if (code === "GLOBAL_RATE_LIMITED" || status === 429) {
    return "SEARCH_RATE_LIMITED";
  }
  if (code === "GLOBAL_UNAUTHENTICATED" || status === 401) {
    return "UNAUTHORIZED";
  }
  if (code === "GLOBAL_FORBIDDEN" || status === 403) {
    return "FORBIDDEN";
  }
  if (status === 400 || code === "GLOBAL_VALIDATION_FAILED") {
    if (trimmedQueryLength < SEARCH_MIN_QUERY_LENGTH) {
      return "SEARCH_QUERY_TOO_SHORT";
    }
    return "SEARCH_INVALID_QUERY";
  }
  if (status >= 500 || code === "GLOBAL_INTERNAL_ERROR") {
    return status === 503
      ? "SEARCH_BACKEND_UNAVAILABLE"
      : "GLOBAL_INTERNAL_ERROR";
  }
  return "GLOBAL_INTERNAL_ERROR";
}
