export const TAG_KEYS = {
  all: ["tags"] as const,
  directory: (limit?: number) => ["tags", "directory", { limit }] as const,
  popular: (params: { limit?: number } = {}) =>
    ["tags", "popular", params] as const,
  trending: (params: { limit?: number } = {}) =>
    ["tags", "trending", params] as const,
  details: () => ["tags", "detail"] as const,
  detail: (slug: string) => ["tags", "detail", slug] as const,
  analytics: (tagId: string) => ["tags", "analytics", tagId] as const,
  related: (slug: string, params: { limit?: number } = {}) =>
    ["tags", "detail", slug, "related", params] as const,
  quizzes: (slug: string, params: { limit?: number } = {}) =>
    ["tags", "detail", slug, "quizzes", params] as const,
  followed: (limit = 100) => ["tags", "followed", { limit }] as const,
} as const;
