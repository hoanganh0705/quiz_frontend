

import { getComments, getQuizzes } from '@/lib/api';

import type {
CreateCommentDto,
EditCommentDto,
VoteDto,
ReportCommentDto,
ReviewReportDto,
} from '@/lib/api/generated/schemas';

export type {
GetCommentResult,
EditCommentResult,
CastVoteResult,
RemoveVoteResult,
ReportCommentResult,
HideCommentResult,
RestoreCommentResult,
ListReportsResult,
ReviewReportResult,
} from '@/lib/api/generated/comments/comments';

export type {
ListQuizCommentsResult,
CreateCommentResult,
} from '@/lib/api/generated/quizzes/quizzes';

export interface ListCommentsParams {
cursor?: string;
limit?: number;
}

export async function listQuizComments(
quizId: string,
params?: ListCommentsParams,
) {
const sdk = getQuizzes();
return sdk.listQuizComments(quizId, params);
}

export async function createComment(
quizId: string,
payload: CreateCommentDto,
) {
const sdk = getQuizzes();
return sdk.createComment(quizId, payload);
}

export async function getComment(commentId: string) {
const sdk = getComments();
return sdk.getComment(commentId);
}

export async function editComment(commentId: string, payload: EditCommentDto) {
const sdk = getComments();
return sdk.editComment(commentId, payload);
}

export async function deleteComment(commentId: string) {
const sdk = getComments();
return sdk.deleteComment(commentId);
}

export async function voteComment(commentId: string, payload: VoteDto) {
const sdk = getComments();
return sdk.castVote(commentId, payload);
}

export async function unvoteComment(commentId: string) {
const sdk = getComments();
return sdk.removeVote(commentId);
}

export async function reportComment(
commentId: string,
payload: ReportCommentDto,
) {
const sdk = getComments();
return sdk.reportComment(commentId, payload);
}

export async function hideComment(commentId: string) {
const sdk = getComments();
return sdk.hideComment(commentId);
}

export async function restoreComment(commentId: string) {
const sdk = getComments();
return sdk.restoreComment(commentId);
}

export async function listReports(params?: ListCommentsParams) {
const sdk = getComments();
return sdk.listReports(params);
}

export async function reviewReport(
reportId: string,
payload: ReviewReportDto,
) {
const sdk = getComments();
return sdk.reviewReport(reportId, payload);
}