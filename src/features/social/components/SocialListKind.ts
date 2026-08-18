

export type SocialListKind =
| "followers"
  | "following"
  | "friends"
  | "blocked"
  | "mutual-friends"
  | "mutual-followers"
  | "activity"
  | "feed";

export const SOCIAL_LIST_KINDS: readonly SocialListKind[] = [
"followers",
"following",
"friends",
"blocked",
"mutual-friends",
"mutual-followers",
"activity",
"feed",
] as const;