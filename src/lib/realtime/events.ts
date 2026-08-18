

export interface WsErrorPayload {
code: string;
message: string;
}

export const INSTANCES_NAMESPACE = "/instances" as const;

export const NOTIFICATIONS_NAMESPACE = "/notifications" as const;

export const COMMENTS_NAMESPACE = "/comments" as const;

export const INSTANCE_JOINED = "instance:joined" as const;

export const INSTANCE_LEFT = "instance:left" as const;

export const INSTANCE_STARTED = "instance:started" as const;

export const INSTANCE_CLOSED = "instance:closed" as const;

export const PLAYER_JOINED = "player:joined" as const;

export const PLAYER_LEFT = "player:left" as const;

export const QUESTION_REVEALED = "question:revealed" as const;

export const ANSWER_RESULT = "answer:result" as const;

export const LEADERBOARD_UPDATED = "leaderboard:updated" as const;

export type InstanceEventName =
| typeof INSTANCE_JOINED
  | typeof INSTANCE_LEFT
  | typeof INSTANCE_STARTED
  | typeof INSTANCE_CLOSED
  | typeof PLAYER_JOINED
  | typeof PLAYER_LEFT
  | typeof QUESTION_REVEALED
  | typeof ANSWER_RESULT
  | typeof LEADERBOARD_UPDATED;

export const NOTIFICATION_SENT = "notification:sent" as const;

export const NOTIFICATION_DELETED = "notification:deleted" as const;

export const NOTIFICATION_READ = "notification:read" as const;

export type NotificationEventName =
| typeof NOTIFICATION_SENT
  | typeof NOTIFICATION_DELETED
  | typeof NOTIFICATION_READ;

export interface InstanceJoinedPayload {
instanceId: string;
userId: string;
username: string;
joinedAt: string; // ISO 8601
}

export interface InstanceLeftPayload {
instanceId: string;
userId: string;
reason?: "left" | "kicked" | "disconnected";
}

export interface InstanceStartedPayload {
instanceId: string;
startedAt: string; // ISO 8601
}

export interface InstanceClosedPayload {
instanceId: string;
reason: "finished" | "cancelled" | "timeout";
closedAt: string; // ISO 8601
}

export type PlayerJoinedPayload = InstanceJoinedPayload;

export type PlayerLeftPayload = InstanceLeftPayload;

export interface QuestionRevealedPayload {
instanceId: string;
questionId: string;
roundId: string;
questionNumber: number;
questionText: string;
options?: string[];
timeLimitSeconds: number;
revealedAt: string; // ISO 8601
}

export interface AnswerResultPayload {
instanceId: string;
questionId: string;
correct: boolean;
correctAnswer?: string;
pointsEarned: number;
totalScore: number;
answeredAt: string; // ISO 8601
}

export interface LeaderboardUpdatedPayload {
instanceId: string;

entries: Array<{
rank: number;
userId: string;
username: string;
score: number;
  }>;
updatedAt: string; // ISO 8601
}

export type InstanceEventPayload =
| InstanceJoinedPayload
  | InstanceLeftPayload
  | InstanceStartedPayload
  | InstanceClosedPayload
  | PlayerJoinedPayload
  | PlayerLeftPayload
  | QuestionRevealedPayload
  | AnswerResultPayload
  | LeaderboardUpdatedPayload;

export interface NotificationSentPayload {
notificationId: string;
type: string;
title: string;
body?: string;
read: boolean;
createdAt: string;
data?: Record<string, unknown>; // Additional context (instanceId, tournamentId, etc.)
}

export interface NotificationDeletedPayload {
notificationId: string;
}

export interface NotificationReadPayload {
notificationId: string;
readAt: string; // ISO 8601
}

export type NotificationEventPayload =
| NotificationSentPayload
  | NotificationDeletedPayload
  | NotificationReadPayload;

export interface InstanceSocketEvent {
event: InstanceEventName;
data: InstanceEventPayload | WsErrorPayload;
}

export interface NotificationSocketEvent {
event: NotificationEventName;
data: NotificationEventPayload | WsErrorPayload;
}

export const INSTANCE_EVENT_NAMES = [
INSTANCE_JOINED,
INSTANCE_LEFT,
INSTANCE_STARTED,
INSTANCE_CLOSED,
PLAYER_JOINED,
PLAYER_LEFT,
QUESTION_REVEALED,
ANSWER_RESULT,
LEADERBOARD_UPDATED,
] as const;

export const NOTIFICATION_EVENT_NAMES = [
NOTIFICATION_SENT,
NOTIFICATION_DELETED,
NOTIFICATION_READ,
] as const;

export const COMMENT_CREATED = "comment:created" as const;
export const COMMENT_EDITED = "comment:edited" as const;
export const COMMENT_DELETED = "comment:deleted" as const;
export const COMMENT_HIDDEN = "comment:hidden" as const;
export const COMMENT_RESTORED = "comment:restored" as const;
export const VOTE_CAST = "vote:cast" as const;
export const VOTE_REMOVED = "vote:removed" as const;

export type CommentEventName =
| typeof COMMENT_CREATED
  | typeof COMMENT_EDITED
  | typeof COMMENT_DELETED
  | typeof COMMENT_HIDDEN
  | typeof COMMENT_RESTORED
  | typeof VOTE_CAST
  | typeof VOTE_REMOVED;

export const COMMENT_EVENT_NAMES = [
COMMENT_CREATED,
COMMENT_EDITED,
COMMENT_DELETED,
COMMENT_HIDDEN,
COMMENT_RESTORED,
VOTE_CAST,
VOTE_REMOVED,
] as const;

export interface CommentSnapshot {
id: string;
quizId: string;
parentCommentId: string | null;
authorId: string;
authorUsername: string;
authorDisplayName: string | null;
authorAvatarUrl: string | null;
body: string;
isHidden: boolean;
votesCount: number;
upvotesCount: number;
downvotesCount: number;
repliesCount: number;
userVote: "upvote" | "downvote" | null;
createdAt: string;
updatedAt: string;
deletedAt: string | null;
isReply: boolean;
}

export interface CommentCreatedPayload {
eventType: "comment_created";
commentId: string;
quizId: string;
parentCommentId: string | null;
authorId: string;
authorUsername: string;
isReply: boolean;
timestamp: string;

snapshot?: CommentSnapshot;
}

export interface CommentEditedPayload {
eventType: "comment_edited";
commentId: string;
quizId: string;
authorId: string;
timestamp: string;

snapshot?: CommentSnapshot;
}

export interface CommentDeletedPayload {
eventType: "comment_deleted";
commentId: string;
quizId: string;
authorId: string;
timestamp: string;

parentCommentId?: string | null;
}

export interface CommentHiddenPayload {
eventType: "comment_hidden";
commentId: string;
quizId: string;
moderatorId: string;
timestamp: string;

snapshot?: CommentSnapshot;
}

export interface CommentRestoredPayload {
eventType: "comment_restored";
commentId: string;
quizId: string;
moderatorId: string;
timestamp: string;

snapshot?: CommentSnapshot;
}

export interface VoteCastPayload {
eventType: "vote_cast";
commentId: string;
quizId: string;
voterId: string;
value: "upvote" | "downvote";
timestamp: string;

votesCount: number;
upvotesCount: number;
downvotesCount: number;
}

export interface VoteRemovedPayload {
eventType: "vote_removed";
commentId: string;
quizId: string;
voterId: string;
timestamp: string;

votesCount: number;
upvotesCount: number;
downvotesCount: number;
}

export type CommentEventPayload =
| CommentCreatedPayload
  | CommentEditedPayload
  | CommentDeletedPayload
  | CommentHiddenPayload
  | CommentRestoredPayload
  | VoteCastPayload
  | VoteRemovedPayload;

export interface CommentSocketEvent {
event: CommentEventName;
data: CommentEventPayload | WsErrorPayload;
}

export const COINS_NAMESPACE = "/coins" as const;

export const COIN_BALANCE_CHANGED = "coin:balance_changed" as const;
export const COIN_TRANSACTION_RECORDED = "coin:transaction_recorded" as const;

export type CoinEventName =
| typeof COIN_BALANCE_CHANGED
  | typeof COIN_TRANSACTION_RECORDED;

export const COIN_EVENT_NAMES = [
COIN_BALANCE_CHANGED,
COIN_TRANSACTION_RECORDED,
] as const;

export interface CoinBalanceChangedPayload {

newBalance: number;

delta: number;

reason: string;

referenceType: string | null;

referenceId: string | null;

timestamp: string;

userId: string;

eventType: "coin.balance_changed";
}

export interface CoinTransactionRecordedPayload {

transactionId: string;

userId: string;

reason: string;

amount: number;

balanceAfter: number;

referenceType: string | null;

referenceId: string | null;

metadata?: Record<string, unknown> | null;

createdAt: string;

eventType: "coin.transaction_recorded";
}

export type CoinEventPayload =
| CoinBalanceChangedPayload
  | CoinTransactionRecordedPayload;

export interface CoinSocketEvent {
event: CoinEventName;
data: CoinEventPayload | WsErrorPayload;
}
