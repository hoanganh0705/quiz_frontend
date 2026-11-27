export const DAILY_CHALLENGE_KEYS = {
  all: ["daily-challenge"] as const,
  today: () => ["daily-challenge", "today"] as const,
  history: (limit: number) => ["daily-challenge", "history", { limit }] as const,
  categories: () => ["daily-challenge", "history", "categories"] as const,
  play: (quizId: string, questionIndex: number) =>
    ["daily-challenge", "play", quizId, questionIndex] as const,
} as const;
