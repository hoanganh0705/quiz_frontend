

export type ActivityItemType =
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

export const ACTIVITY_ITEM_TYPES: readonly ActivityItemType[] = [
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

export function isActivityItemType(value: unknown): value is ActivityItemType {
return (
typeof value === "string" &&
(ACTIVITY_ITEM_TYPES as readonly string[]).includes(value)
  );
}

export const DEFENSIVE_FALLBACK_TESTID = "activity-item-unsupported" as const;

import type { ErrorCode } from "@/lib/api/error-codes";

export const ACTIVITY_RATE_LIMIT_ERROR_CODES: readonly ErrorCode[] = [
"GLOBAL_RATE_LIMITED",
"ACTIVITY_RATE_LIMITED",
] as const;

export function isActivityRateLimitCode(code: ErrorCode | undefined): boolean {
if (!code) return false;
return (ACTIVITY_RATE_LIMIT_ERROR_CODES as readonly string[]).includes(code);
}

export const ACTIVITY_DISCRIMINATOR_INVARIANTS = Object.freeze({
itemTypes: ACTIVITY_ITEM_TYPES,
defensiveFallbackTestId: DEFENSIVE_FALLBACK_TESTID,
rateLimitErrorCodes: ACTIVITY_RATE_LIMIT_ERROR_CODES,
});
