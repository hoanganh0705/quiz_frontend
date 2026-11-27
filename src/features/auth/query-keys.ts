export const AUTH_KEYS = {
  all: ["auth"] as const,
  me: () => ["auth", "me"] as const,
  sessions: () => ["auth", "sessions"] as const,
  securityDashboard: () => ["auth", "security-dashboard"] as const,
} as const;
