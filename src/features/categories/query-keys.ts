export const CATEGORY_KEYS = {
  all: ["categories"] as const,
  ranked: (params: { limit?: number } = {}) =>
    ["categories", "ranked", params] as const,
  trending: (params: { limit?: number } = {}) =>
    ["categories", "trending", params] as const,
  details: () => ["categories", "detail"] as const,
  detail: (idOrSlug: string) => ["categories", "detail", idOrSlug] as const,
  quizzes: (idOrSlug: string, params: { limit?: number } = {}) =>
    ["categories", "detail", idOrSlug, "quizzes", params] as const,
  followed: (limit = 100) => ["categories", "followed", { limit }] as const,
} as const;
