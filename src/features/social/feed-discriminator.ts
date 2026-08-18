

export type FeedItemType =
| "badge_earned"
  | "badge_revoked"
  | "rank_milestone"
  | "peak_rank_achieved"
  | "tournament_joined"
  | "tournament_completed"
  | "tournament_won"
  | "comment_created"
  | "quiz_completed"
  | "quiz_milestone"
  | "instance_created"
  | "instance_joined"
  | "instance_completed";

export const FEED_ITEM_TYPES: readonly FeedItemType[] = [
"badge_earned",
"badge_revoked",
"rank_milestone",
"peak_rank_achieved",
"tournament_joined",
"tournament_completed",
"tournament_won",
"comment_created",
"quiz_completed",
"quiz_milestone",
"instance_created",
"instance_joined",
"instance_completed",
] as const;

export function isFeedItemType(value: unknown): value is FeedItemType {
return (
typeof value === "string" &&
(FEED_ITEM_TYPES as readonly string[]).includes(value)
  );
}

export const FEED_DEFENSIVE_FALLBACK_TESTID = "feed-item-unknown" as const;

export const FEED_DISCRIMINATOR_INVARIANTS = Object.freeze({
itemTypes: FEED_ITEM_TYPES,
defensiveFallbackTestId: FEED_DEFENSIVE_FALLBACK_TESTID,
});