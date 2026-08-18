

import { getComments } from '@/lib/api';
import type {
ReportDto,
ReviewReportDto,
} from '@/lib/api/generated/schemas';

export type {
ListReportsResult,
HideCommentResult,
RestoreCommentResult,
} from '@/lib/api/generated/comments/comments';

export type CommentReportDto = ReportDto;

export interface CommentHideRequestDto {
reason?: string;
}

export interface CommentRestoreRequestDto {
reason?: string;
}

export type ReportActionDto = ReviewReportDto;

export interface ListCommentReportsParams {
cursor?: string;
limit?: number;
}

export interface CommentReportsPage {
items: CommentReportDto[];
hasNextPage: boolean;
nextCursor: string | null;
}

export async function listCommentReports(
params: ListCommentReportsParams = {},
): Promise<CommentReportsPage> {
const sdk = getComments();
const wrapped = await sdk.listReports(params);
const items = (wrapped.data as unknown as CommentReportDto[]) ?? [];
const pagination = (wrapped as unknown as {
meta?: { pagination?: { hasNextPage?: boolean; nextCursor?: string | null } };
  }).meta?.pagination;
const hasNextPage = pagination?.hasNextPage ?? false;
const nextCursor = pagination?.nextCursor ?? null;
return { items, hasNextPage, nextCursor };
}

export async function patchCommentReport(
reportId: string,
action: ReportActionDto,
): Promise<CommentReportDto> {
const sdk = getComments();
const wrapped = await sdk.reviewReport(reportId, action);
const inner = wrapped.data as unknown as { data?: CommentReportDto };
return (inner.data ?? (wrapped.data as CommentReportDto)) as CommentReportDto;
}

export async function hideComment(
commentId: string,
input: CommentHideRequestDto,
): Promise<unknown> {
const sdk = getComments();
void input;
const wrapped = await sdk.hideComment(commentId);
return (wrapped.data as unknown as { data?: unknown }).data ?? wrapped.data;
}

export async function restoreComment(
commentId: string,
input: CommentRestoreRequestDto,
): Promise<unknown> {
const sdk = getComments();
void input;
const wrapped = await sdk.restoreComment(commentId);
return (wrapped.data as unknown as { data?: unknown }).data ?? wrapped.data;
}
