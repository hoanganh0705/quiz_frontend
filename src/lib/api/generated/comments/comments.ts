

import type {
EditComment200,
EditCommentDto,
GetComment200,
HideComment200,
ListReports200,
ListReportsParams,
ReportComment201,
ReportCommentDto,
RestoreComment200,
ReviewReport200,
ReviewReportDto,
VoteDto
} from '.././schemas';

import { orvalCustomInstance } from '../../core/custom-instance';

export const getComments = () => {

const getComment = (
commentId: string,
 ) => {
return orvalCustomInstance<GetComment200>(
{url: `/api/v1/comments/${commentId}`, method: 'GET'
    },
      );
    }

const editComment = (
commentId: string,
editCommentDto: EditCommentDto,
 ) => {
return orvalCustomInstance<EditComment200>(
{url: `/api/v1/comments/${commentId}`, method: 'PATCH',
headers: {'Content-Type': 'application/json', },
data: editCommentDto
    },
      );
    }

const deleteComment = (
commentId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/comments/${commentId}`, method: 'DELETE'
    },
      );
    }

const castVote = (
commentId: string,
voteDto: VoteDto,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/comments/${commentId}/vote`, method: 'PUT',
headers: {'Content-Type': 'application/json', },
data: voteDto
    },
      );
    }

const removeVote = (
commentId: string,
 ) => {
return orvalCustomInstance<void>(
{url: `/api/v1/comments/${commentId}/vote`, method: 'DELETE'
    },
      );
    }

const reportComment = (
commentId: string,
reportCommentDto: ReportCommentDto,
 ) => {
return orvalCustomInstance<ReportComment201>(
{url: `/api/v1/comments/${commentId}/reports`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: reportCommentDto
    },
      );
    }

const hideComment = (
commentId: string,
 ) => {
return orvalCustomInstance<HideComment200>(
{url: `/api/v1/comments/${commentId}/hide`, method: 'POST'
    },
      );
    }

const restoreComment = (
commentId: string,
 ) => {
return orvalCustomInstance<RestoreComment200>(
{url: `/api/v1/comments/${commentId}/restore`, method: 'POST'
    },
      );
    }

const listReports = (
params?: ListReportsParams,
 ) => {
return orvalCustomInstance<ListReports200>(
{url: `/api/v1/comments/reports`, method: 'GET',
params
    },
      );
    }

const reviewReport = (
reportId: string,
reviewReportDto: ReviewReportDto,
 ) => {
return orvalCustomInstance<ReviewReport200>(
{url: `/api/v1/comments/reports/${reportId}/review`, method: 'POST',
headers: {'Content-Type': 'application/json', },
data: reviewReportDto
    },
      );
    }
return {getComment,editComment,deleteComment,castVote,removeVote,reportComment,hideComment,restoreComment,listReports,reviewReport}};
export type GetCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['getComment']>>>
export type EditCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['editComment']>>>
export type DeleteCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['deleteComment']>>>
export type CastVoteResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['castVote']>>>
export type RemoveVoteResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['removeVote']>>>
export type ReportCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['reportComment']>>>
export type HideCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['hideComment']>>>
export type RestoreCommentResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['restoreComment']>>>
export type ListReportsResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['listReports']>>>
export type ReviewReportResult = NonNullable<Awaited<ReturnType<ReturnType<typeof getComments>['reviewReport']>>>
