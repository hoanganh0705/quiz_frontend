

import type {
UserActivityItemDto,
UserActivityItemDtoType,
UserActivityItemDtoPayload,
} from "@/lib/api/generated/schemas";

export type { UserActivityItemDto, UserActivityItemDtoType };
export type { UserActivityItemDtoPayload };

export function myActivityKey(): readonly ["users", "me", "activity"] {
return ["users", "me", "activity"];
}

export type BadgeEarnedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "badge_earned" }
>;

export type RankMilestonePayload = Extract<
UserActivityItemDtoPayload,
{ type: "rank_milestone" }
>;

export type TournamentJoinedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "tournament_joined" }
>;

export type TournamentCompletedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "tournament_completed" }
>;

export type TournamentWonPayload = Extract<
UserActivityItemDtoPayload,
{ type: "tournament_won" }
>;

export type QuizCompletedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "quiz_completed" }
>;

export type QuizMilestonePayload = Extract<
UserActivityItemDtoPayload,
{ type: "quiz_milestone" }
>;

export type CommentCreatedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "comment_created" }
>;

export type InstanceCompletedPayload = Extract<
UserActivityItemDtoPayload,
{ type: "instance_completed" }
>;

export function isBadgeActivity(
item: UserActivityItemDto
): item is UserActivityItemDto & { payload: BadgeEarnedPayload } {
return item.type === "badge_earned";
}

export function isTournamentActivity(
item: UserActivityItemDto
): item is
| (UserActivityItemDto & { payload: TournamentJoinedPayload })
  | (UserActivityItemDto & { payload: TournamentCompletedPayload })
  | (UserActivityItemDto & { payload: TournamentWonPayload }) {
return (
item.type === "tournament_joined" ||
item.type === "tournament_completed" ||
item.type === "tournament_won"
  );
}

export function isQuizActivity(
item: UserActivityItemDto
): item is
| (UserActivityItemDto & { payload: QuizCompletedPayload })
  | (UserActivityItemDto & { payload: QuizMilestonePayload }) {
return item.type === "quiz_completed" || item.type === "quiz_milestone";
}

export function isCommentActivity(
item: UserActivityItemDto
): item is UserActivityItemDto & { payload: CommentCreatedPayload } {
return item.type === "comment_created";
}
